import { useCallback, useMemo, useRef, useState } from 'react';
import type { CalendarController, EventInput } from '@fullcalendar/react';
import { startOfDay } from 'date-fns';
import type { DateSpan } from '@/components/bookings/BookingsCalendar';
import type { BookingDraft, BookingPreview } from '@/components/bookings/CreateBookingForm';
import type { DateRange } from '@/hooks/use-calendar-events';
import type { BookingView, Room } from '@/lib/types/booking';
import { atMinutes } from '@/lib/utils/bookingTime';
import {
  type BookingEventProps,
  CLASS_TYPE_LABELS,
  MINE_COLOR,
  ROOM_LABELS,
} from '@/lib/utils/calendarEvents';

export const PREVIEW_EVENT_ID = 'new-booking';
export const PREVIEW_EVENT_TITLE = 'New booking';
const PREVIEW_EVENT_CLASS =
  'border-dashed! border-[color-mix(in_oklab,var(--fc-event-color)_50%,var(--foreground))]! bg-[color-mix(in_oklab,var(--fc-event-color)_10%,var(--background))]!';

interface UseNewBookingOptions {
  controller: CalendarController;
  /** The room the calendar shows, or null for "my bookings" only. */
  room: Room | null;
  range: DateRange | null;
  /** Shows a room's schedule on the calendar. */
  showRoom: (room: Room) => void;
  /** Every room's bookings in the visible range, from the calendar. */
  schedules: Record<Room, BookingView[]> | null;
  /** Reloads the calendar's bookings. */
  refresh: () => Promise<void>;
  /** Whether the form shows in the side panel rather than a dialog. */
  sidePanel: boolean;
}

/**
 * Today if it's on screen or the screen shows the past, otherwise the first
 * day shown, so the form opens on the week the user is looking at.
 */
export function suggestedDay(range: DateRange | null, now = new Date()): Date {
  if (!range || range.start <= now) return now;
  return range.start;
}

/**
 * The calendar's placeholder for the booking in the form, or null until it has
 * a date and a valid time.
 */
export function previewEventFor(preview: BookingPreview | null): EventInput | null {
  if (!preview?.date || preview.start === undefined || preview.end === undefined) return null;
  if (preview.end <= preview.start) return null;
  const props: BookingEventProps = {
    // Named like a real booking once there's a class type to name it by.
    heading: preview.classType ? CLASS_TYPE_LABELS[preview.classType] : PREVIEW_EVENT_TITLE,
    detail: preview.room && ROOM_LABELS[preview.room],
    shareable: preview.isShareable,
    mine: true,
  };
  return {
    id: PREVIEW_EVENT_ID,
    start: atMinutes(preview.date, preview.start),
    end: atMinutes(preview.date, preview.end),
    color: MINE_COLOR,
    // Dragging or resizing it moves the time in the form.
    editable: true,
    // A pale fill inside a dashed outline in the text's colour marks it as a
    // draft, not a booking yet. Important, as the registry's tile classes set
    // their own border and background.
    className: PREVIEW_EVENT_CLASS,
    extendedProps: props,
  };
}

/** The draft that recreates the form as it stands, for when it has to remount. */
function draftFromPreview(preview: BookingPreview): BookingDraft {
  const { room, date, start, end, classType, isShareable } = preview;
  const time =
    date && start !== undefined && end !== undefined
      ? { start: atMinutes(date, start), end: atMinutes(date, end) }
      : { day: date };
  return { room, classType, isShareable, ...time };
}

/**
 * The booking flow on the calendar page: opening the form from a dragged range
 * or the "New booking" button, keeping the calendar on the form's room and day
 * with a draggable placeholder for the new booking, and the confirmation once
 * it's booked. The page renders the form and confirmation; this owns the state.
 */
export function useNewBooking({
  controller,
  room,
  range,
  showRoom,
  schedules,
  refresh,
  sidePanel,
}: UseNewBookingOptions) {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [preview, setPreview] = useState<BookingPreview | null>(null);
  // Set once the booking is made: the confirmation replaces the form until
  // the user closes it.
  const [confirmed, setConfirmed] = useState<BookingView | null>(null);
  // While a booking is being sent the form can't close, or it would be made
  // without the user ever seeing the confirmation.
  const [submitting, setSubmitting] = useState(false);
  // The view to go back to on close, since the form switches to day view.
  const viewBeforeBooking = useRef<string | null>(null);
  const previewDay = useRef<number | null>(null);

  // The panel and the dialog each hold their own form, so crossing between
  // them mounts a new one. Seed it with what the user had chosen.
  const [lastSidePanel, setLastSidePanel] = useState(sidePanel);
  if (sidePanel !== lastSidePanel) {
    setLastSidePanel(sidePanel);
    if (draft && preview) setDraft(draftFromPreview(preview));
  }

  const open = (next: BookingDraft) => {
    if (!draft) viewBeforeBooking.current = controller.view?.type ?? null;
    // Picking a new range from the confirmation starts the next booking.
    setConfirmed(null);
    setDraft(next);
  };

  const close = useCallback(() => {
    if (submitting) return;
    setDraft(null);
    setPreview(null);
    setConfirmed(null);
    previewDay.current = null;
    if (viewBeforeBooking.current) controller.changeView(viewBeforeBooking.current);
    viewBeforeBooking.current = null;
  }, [controller, submitting]);

  // The calendar stays on the booking's day behind the confirmation, with the
  // placeholder replaced by the real booking once it reloads.
  const handleBooked = useCallback(
    (booking: BookingView) => {
      // The form unmounts for the confirmation without reporting it's done.
      setSubmitting(false);
      setConfirmed(booking);
      setPreview(null);
      void refresh();
    },
    [refresh]
  );

  const handleConflict = useCallback(() => void refresh(), [refresh]);

  // While the form is open the calendar follows it: the chosen room's schedule
  // on the chosen day, so the user sees what else is booked around their time.
  const handlePreviewChange = useCallback(
    (next: BookingPreview) => {
      setPreview(next);
      if (next.room) showRoom(next.room);
      const day = next.date ? startOfDay(next.date).getTime() : null;
      if (day !== null && day !== previewDay.current) {
        previewDay.current = day;
        controller.changeView('timeGridDay');
        controller.gotoDate(day);
      }
    },
    [controller, showRoom]
  );

  const previewEvent = useMemo(() => previewEventFor(preview), [preview]);

  // The calendar's bookings cover the form's day once it has navigated there,
  // so the form checks clashes against those rather than fetching them again.
  const schedule = useMemo(() => {
    if (!preview?.room || !preview.date || !schedules || !range) return null;
    const inRange = preview.date >= range.start && preview.date < range.end;
    return inRange ? schedules[preview.room] : null;
  }, [preview, schedules, range]);

  return {
    isOpen: draft !== null,
    submitting,
    handleSubmittingChange: setSubmitting,
    draft,
    confirmed,
    schedule,
    previewEvent,
    openNew: () => open({ room: room ?? undefined, day: suggestedDay(range) }),
    close,
    handleBooked,
    handleConflict,
    handlePreviewChange,
    /** A range picked on the calendar: opens the form, or moves its time if open. */
    select: (span: DateSpan) =>
      open({ room: preview?.room ?? room ?? undefined, start: span.start, end: span.end }),
    /** The placeholder was dragged or resized. */
    movePreview: (event: { id: string; start: Date | null; end: Date | null }) => {
      if (event.id !== PREVIEW_EVENT_ID || !event.start || !event.end) return;
      setDraft({ room: preview?.room, start: event.start, end: event.end });
    },
    /** A room filter was clicked while the form is open: it books that room. */
    chooseRoom: (next: Room) => setDraft({ room: next }),
  };
}
