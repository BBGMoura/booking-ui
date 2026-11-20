'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCalendarController } from '@fullcalendar/react';
import { PlusIcon } from 'lucide-react';
import { BookingDetailsPopover } from '@/components/bookings/BookingDetailsPopover';
import { BookingsCalendar, type DateSpan } from '@/components/bookings/BookingsCalendar';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { NewBookingPanel } from '@/components/bookings/NewBookingPanel';
import { Button } from '@/components/ui/button';
import { useBookingDetails } from '@/hooks/use-booking-details';
import { useCalendarEvents, type DateRange } from '@/hooks/use-calendar-events';
import { useCalendarView } from '@/hooks/use-calendar-view';
import { useFixedHeightLayout } from '@/hooks/use-fixed-height-layout';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNewBooking } from '@/hooks/use-new-booking';
import { useAuth } from '@/lib/context/AuthContext';
import { USER_ROLES } from '@/lib/types/auth';

// Wide and tall enough for the booking form to sit beside the calendar rather
// than over it.
const SIDE_PANEL_QUERY = '(min-width: 1024px) and (min-height: 600px)';

export default function CalendarPage() {
  const { room, showMine, showMineLocked, selectRoom, showRoom, setShowMine } = useCalendarView();
  const controller = useCalendarController();
  const sidePanel = useMediaQuery(SIDE_PANEL_QUERY);
  const fixedHeight = useFixedHeightLayout();
  const { user, hasRole } = useAuth();
  const [range, setRange] = useState<DateRange | null>(null);
  const { events, schedules, loading, error, refresh, removeBooking } = useCalendarEvents(
    room,
    showMine,
    range,
    {
      showBooker: hasRole(USER_ROLES.ADMIN),
      viewerName: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
    }
  );
  const bookingDetails = useBookingDetails();
  const booking = useNewBooking({
    controller,
    room,
    range,
    showRoom,
    schedules,
    refresh,
    sidePanel,
  });

  const handleCancelled = useCallback(
    (uid: string) => {
      removeBooking(uid);
      void refresh();
    },
    [removeBooking, refresh]
  );

  // Keeps the same object while the range is unchanged, since a new one makes
  // the bookings load again.
  const handleRangeChange = useCallback(
    (next: DateSpan) =>
      setRange((current) =>
        current &&
        current.start.getTime() === next.start.getTime() &&
        current.end.getTime() === next.end.getTime()
          ? current
          : next
      ),
    []
  );
  const calendarEvents = useMemo(
    () => (booking.previewEvent ? [...events, booking.previewEvent] : events),
    [events, booking.previewEvent]
  );
  // While the form is open, the room filters pick the form's room, so the
  // calendar and the form can't show different rooms.
  const handleRoomSelect = booking.isOpen && !booking.confirmed ? booking.chooseRoom : selectRoom;

  return (
    // When the layout is locked to the viewport, the page takes the remaining
    // height and the calendar scrolls inside its card, keeping the toolbar and
    // day headers in view. Otherwise (phones) the calendar is full height and
    // the whole page scrolls, since a viewport-high grid would be too short.
    // On phones the calendar fills the page: the negative margin cancels the
    // layout's padding (p-10), and the controls and error put back their own.
    <div className="flex min-h-0 flex-1 flex-col gap-4 max-md:-m-10">
      <div className="flex items-start justify-between gap-3 max-md:px-4 max-md:pt-4">
        <CalendarControls
          room={room}
          showMine={showMine}
          showMineLocked={showMineLocked}
          onRoomSelect={handleRoomSelect}
          onShowMineChange={setShowMine}
        />
        <Button
          className="hidden shrink-0 sm:inline-flex"
          onClick={booking.openNew}
          disabled={booking.isOpen}
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
        onClick={booking.openNew}
      >
        <PlusIcon />
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm max-md:px-4">
          {error}
        </p>
      )}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="bg-card relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border shadow-sm max-md:rounded-none max-md:border-x-0 max-md:shadow-none">
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
            height={fixedHeight ? '100%' : 'auto'}
            events={calendarEvents}
            onRangeChange={handleRangeChange}
            onSelect={booking.select}
            onEventChange={booking.movePreview}
            onBookingClick={bookingDetails.open}
          />
        </div>
        {booking.isOpen && sidePanel && <NewBookingPanel booking={booking} sidePanel />}
      </div>
      {booking.isOpen && !sidePanel && <NewBookingPanel booking={booking} sidePanel={false} />}
      {bookingDetails.selected && (
        <BookingDetailsPopover
          key={bookingDetails.selected.details.uid}
          details={bookingDetails.selected.details}
          anchor={bookingDetails.selected.anchor}
          isAdmin={hasRole(USER_ROLES.ADMIN)}
          onClose={bookingDetails.close}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}
