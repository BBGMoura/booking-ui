'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  type BusinessHoursInput,
  type EventInput,
  useCalendarController,
} from '@fullcalendar/react';
import { startOfDay } from 'date-fns';
import { PlusIcon, XIcon } from 'lucide-react';
import { BookingConfirmation } from '@/components/bookings/BookingConfirmation';
import { BookingEventContent } from '@/components/bookings/BookingEventContent';
import {
  type BookingDraft,
  type BookingPreview,
  CreateBookingForm,
} from '@/components/bookings/CreateBookingForm';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCalendarEvents, type DateRange } from '@/hooks/use-calendar-events';
import { useCalendarView } from '@/hooks/use-calendar-view';
import { useFixedHeightLayout } from '@/hooks/use-fixed-height-layout';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useAuth } from '@/lib/context/AuthContext';
import { USER_ROLES } from '@/lib/types/auth';
import type { BookingView } from '@/lib/types/booking';
import {
  atMinutes,
  OPENING_HOURS_BY_DAY,
  TIME_STEP_MINUTES,
  validateBookingTime,
} from '@/lib/utils/bookingTime';
import { type BookingEventProps, MINE_COLOR, ROOM_LABELS } from '@/lib/utils/calendarEvents';
import { initialScrollTime, toTime } from '@/lib/utils/calendarUtils';

const AVAILABLE_VIEWS = ['timeGridWeek', 'timeGridDay'];

// Mirrors the backend's `schedule` config, which isn't exposed over the API.
// Per-day closed time is shaded via businessHours.
const OPENING_HOURS: BusinessHoursInput = OPENING_HOURS_BY_DAY.map(({ open, close }, day) => ({
  daysOfWeek: [day],
  startTime: toTime(open),
  endTime: toTime(close),
}));

const CLOSED_HOURS_CLASS = 'bg-muted/60';

// An hour either side of the earliest opening (09:00) and latest closing
// (19:30), so both ends of the day read as closed time rather than being cut
// off. The start stays on the hour because FullCalendar labels slots from
// slotMinTime, so a half-hour start would put every label on the half hour.
const GRID_START_MINUTES = 8 * 60;
const GRID_END_MINUTES = 20 * 60 + 30;

// Tiles shorter than this (in px) put their lines side by side instead of
// stacking them. The registry's default (50px) made an hour-long booking
// count as short, so its details ran together on one line.
const EVENT_SHORT_HEIGHT = 30;

// Wide and tall enough for the booking form to sit beside the calendar rather
// than over it.
const SIDE_PANEL_QUERY = '(min-width: 1024px) and (min-height: 600px)';

const PREVIEW_EVENT_ID = 'new-booking';

const BOOKING_TITLE = 'New booking';
const BOOKING_DESCRIPTION = 'Choose a room and time, then the type of class.';
const CONFIRMED_TITLE = 'Booking confirmed';
const CONFIRMED_DESCRIPTION = 'Here are the details of your booking.';

// Today if it's on screen, otherwise the first day shown, so the form opens on
// the week the user is looking at.
function suggestedDay(range: DateRange | null): Date {
  const today = new Date();
  if (!range || (today >= range.start && today < range.end)) return today;
  return range.start;
}

export default function BookingsPage() {
  const { room, showMine, showMineLocked, selectRoom, showRoom, setShowMine } = useCalendarView();
  const controller = useCalendarController();
  const sidePanel = useMediaQuery(SIDE_PANEL_QUERY);
  const [scrollTime] = useState(() => initialScrollTime(new Date(), GRID_START_MINUTES));
  const fixedHeight = useFixedHeightLayout();
  const { user, hasRole } = useAuth();
  const [range, setRange] = useState<DateRange | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [preview, setPreview] = useState<BookingPreview | null>(null);
  // Set once the booking is made: the panel shows its confirmation instead of
  // the form until the user closes it.
  const [confirmed, setConfirmed] = useState<BookingView | null>(null);
  // The view to go back to once the form closes, since it switches to day view.
  const viewBeforeBooking = useRef<string | null>(null);
  const previewDay = useRef<number | null>(null);
  const { events, loading, error, refresh } = useCalendarEvents(room, showMine, range, {
    showBooker: hasRole(USER_ROLES.ADMIN),
    viewerName: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
  });
  const handleDatesSet = useCallback(
    (info: { start: Date; end: Date }) =>
      setRange((current) =>
        current &&
        current.start.getTime() === info.start.getTime() &&
        current.end.getTime() === info.end.getTime()
          ? current
          : { start: info.start, end: info.end }
      ),
    []
  );
  const openBooking = (next: BookingDraft) => {
    if (!draft) viewBeforeBooking.current = controller.view?.type ?? null;
    // Picking a new range from the confirmation starts the next booking.
    setConfirmed(null);
    setDraft(next);
  };
  const openNewBooking = () => openBooking({ room: room ?? undefined, day: suggestedDay(range) });
  const closeBooking = useCallback(() => {
    setDraft(null);
    setPreview(null);
    setConfirmed(null);
    previewDay.current = null;
    if (viewBeforeBooking.current) controller.changeView(viewBeforeBooking.current);
    viewBeforeBooking.current = null;
  }, [controller]);
  // The calendar stays on the booking's day behind the confirmation, with the
  // placeholder replaced by the real booking once it reloads.
  const handleBooked = useCallback(
    (booking: BookingView) => {
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

  const calendarEvents = useMemo((): EventInput[] => {
    if (!preview?.date || preview.start == null || preview.end == null) return events;
    if (preview.end <= preview.start) return events;
    const props: BookingEventProps = {
      heading: BOOKING_TITLE,
      detail: preview.room && ROOM_LABELS[preview.room],
      shareable: preview.isShareable,
      mine: true,
    };
    const previewEvent: EventInput = {
      id: PREVIEW_EVENT_ID,
      start: atMinutes(preview.date, preview.start),
      end: atMinutes(preview.date, preview.end),
      color: MINE_COLOR,
      // Dragging or resizing it moves the time in the form.
      editable: true,
      classNames: ['border-dashed', 'border-(--fc-event-color)'],
      extendedProps: props,
    };
    return [...events, previewEvent];
  }, [events, preview]);

  const movePreview = (event: { id: string; start: Date | null; end: Date | null }) => {
    if (event.id !== PREVIEW_EVENT_ID || !event.start || !event.end) return;
    setDraft({ room: preview?.room, start: event.start, end: event.end });
  };

  const title = confirmed ? CONFIRMED_TITLE : BOOKING_TITLE;
  const description = confirmed ? CONFIRMED_DESCRIPTION : BOOKING_DESCRIPTION;
  const bookingContent = confirmed ? (
    <BookingConfirmation booking={confirmed} onDone={closeBooking} />
  ) : (
    draft && (
      <CreateBookingForm
        draft={draft}
        onPreviewChange={handlePreviewChange}
        onBooked={handleBooked}
        onConflict={handleConflict}
      />
    )
  );

  return (
    // When the layout is locked to the viewport, the page takes the remaining
    // height and the calendar scrolls inside its card, keeping the toolbar and
    // day headers in view. Otherwise (phones) the calendar is full height and
    // the whole page scrolls, since a viewport-high grid would be too short.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <CalendarControls
          room={room}
          showMine={showMine}
          showMineLocked={showMineLocked}
          onRoomSelect={selectRoom}
          onShowMineChange={setShowMine}
        />
        <Button
          className="hidden shrink-0 sm:inline-flex"
          onClick={openNewBooking}
          disabled={!!draft}
        >
          <PlusIcon />
          New booking
        </Button>
      </div>
      {/* Phones have no room for the button beside the room filters, so it
          floats bottom right, where a page's main action usually sits. */}
      <Button
        size="icon"
        className="fixed right-5 bottom-5 z-40 size-14 rounded-full shadow-lg sm:hidden [&_svg:not([class*='size-'])]:size-6"
        aria-label="New booking"
        onClick={openNewBooking}
      >
        <PlusIcon />
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="bg-card relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
          {loading && (
            // A thin bar rather than a spinner over the grid, so a quick load
            // doesn't flash anything big.
            <div
              role="status"
              className="bg-primary absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse"
            >
              <span className="sr-only">Loading bookings</span>
            </div>
          )}
          <BookingsCalendar
            controller={controller}
            availableViews={AVAILABLE_VIEWS}
            height={fixedHeight ? '100%' : 'auto'}
            nowIndicator
            events={calendarEvents}
            eventContent={BookingEventContent}
            eventShortHeight={EVENT_SHORT_HEIGHT}
            slotEventOverlap={false}
            datesSet={handleDatesSet}
            firstDay={1}
            allDaySlot={false}
            slotMinTime={toTime(GRID_START_MINUTES)}
            scrollTime={scrollTime}
            slotMaxTime={toTime(GRID_END_MINUTES)}
            businessHours={OPENING_HOURS}
            nonBusinessHoursClass={CLOSED_HOURS_CLASS}
            selectable
            // Shows the range being dragged as a placeholder booking with its times,
            // in the colour of the user's own bookings since that's what it becomes.
            // Every real event sets its own colour, so eventColor only reaches it.
            selectMirror
            eventColor={MINE_COLOR}
            // The placeholder already shows the range, so the registry's fill
            // behind it would only double it up.
            highlightClass="hidden"
            snapDuration={toTime(TIME_STEP_MINUTES)}
            selectAllow={(span) => validateBookingTime(span.start, span.end) === null}
            select={(info) => {
              // With the form open, a new range moves its time rather than
              // starting over.
              openBooking({
                room: preview?.room ?? room ?? undefined,
                start: info.start,
                end: info.end,
              });
              info.view.calendar.unselect();
            }}
            eventDrop={(info) => movePreview(info.event)}
            eventResize={(info) => movePreview(info.event)}
          />
        </div>
        {draft && sidePanel && (
          <aside
            aria-labelledby="new-booking-title"
            className="bg-card flex w-96 shrink-0 flex-col rounded-2xl border p-6 shadow-sm"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 id="new-booking-title" className="text-lg leading-none font-semibold">
                  {title}
                </h2>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-2 -mr-2"
                aria-label="Close"
                onClick={closeBooking}
              >
                <XIcon />
              </Button>
            </div>
            {bookingContent}
          </aside>
        )}
      </div>
      {draft && !sidePanel && (
        <Dialog open onOpenChange={(open) => !open && closeBooking()}>
          {/* As wide as the screen on phones, centred like any other dialog. */}
          <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col max-sm:max-w-none max-sm:border-x-0">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {/* Phones need the room for the form itself. */}
              <DialogDescription className="sr-only sm:not-sr-only">
                {description}
              </DialogDescription>
            </DialogHeader>
            {bookingContent}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
