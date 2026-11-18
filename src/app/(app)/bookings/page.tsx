'use client';

import { useCallback, useState } from 'react';
import type { BusinessHoursInput } from '@fullcalendar/react';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { BookingEventContent } from '@/components/bookings/BookingEventContent';
import { type BookingDraft, CreateBookingModal } from '@/components/bookings/CreateBookingModal';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';
import { Button } from '@/components/ui/button';
import { useCalendarEvents, type DateRange } from '@/hooks/use-calendar-events';
import { useCalendarView } from '@/hooks/use-calendar-view';
import { useFixedHeightLayout } from '@/hooks/use-fixed-height-layout';
import { useAuth } from '@/lib/context/AuthContext';
import { USER_ROLES } from '@/lib/types/auth';
import {
  OPENING_HOURS_BY_DAY,
  TIME_STEP_MINUTES,
  validateBookingTime,
} from '@/lib/utils/bookingTime';
import { MINE_COLOR } from '@/lib/utils/calendarEvents';
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

// Today if it's on screen, otherwise the first day shown, so the form opens on
// the week the user is looking at.
function suggestedDay(range: DateRange | null): Date {
  const today = new Date();
  if (!range || (today >= range.start && today < range.end)) return today;
  return range.start;
}

export default function BookingsPage() {
  const { room, showMine, showMineLocked, selectRoom, setShowMine } = useCalendarView();
  const [scrollTime] = useState(() => initialScrollTime(new Date(), GRID_START_MINUTES));
  const fixedHeight = useFixedHeightLayout();
  const { user, hasRole } = useAuth();
  const [range, setRange] = useState<DateRange | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
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
  const openNewBooking = () => setDraft({ room: room ?? undefined, day: suggestedDay(range) });
  const closeModal = useCallback(() => setDraft(null), []);
  const handleBooked = useCallback(() => {
    setDraft(null);
    void refresh();
  }, [refresh]);
  const handleSlotUnavailable = useCallback(
    (message: string) => {
      setDraft(null);
      toast.error(message);
      void refresh();
    },
    [refresh]
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
        <Button className="hidden shrink-0 sm:inline-flex" onClick={openNewBooking}>
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
      <div className="bg-card relative min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
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
          availableViews={AVAILABLE_VIEWS}
          height={fixedHeight ? '100%' : 'auto'}
          nowIndicator
          events={events}
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
            setDraft({ room: room ?? undefined, start: info.start, end: info.end });
            info.view.calendar.unselect();
          }}
        />
      </div>
      {draft && (
        <CreateBookingModal
          draft={draft}
          onClose={closeModal}
          onBooked={handleBooked}
          onSlotUnavailable={handleSlotUnavailable}
        />
      )}
    </div>
  );
}
