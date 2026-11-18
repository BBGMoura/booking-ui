'use client';

import { useState, useSyncExternalStore } from 'react';
import type { BusinessHoursInput } from '@fullcalendar/react';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { EventCalendar } from '@/components/event-calendar';
import { useCalendarView } from '@/hooks/use-calendar-view';
import { initialScrollTime, toTime } from '@/lib/utils/calendarUtils';

const AVAILABLE_VIEWS = ['timeGridWeek', 'timeGridDay'];

// Mirrors the backend's `schedule` config, which isn't exposed over the API.
// Per-day closed time is shaded via businessHours.
const OPENING_HOURS: BusinessHoursInput = [
  { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '19:00' },
  { daysOfWeek: [6], startTime: '09:30', endTime: '19:30' },
  { daysOfWeek: [0], startTime: '11:00', endTime: '17:00' },
];

const CLOSED_HOURS_CLASS = 'bg-muted/60';

// An hour either side of the earliest opening (09:00) and latest closing
// (19:30), so both ends of the day read as closed time rather than being cut
// off. The start stays on the hour because FullCalendar labels slots from
// slotMinTime, so a half-hour start would put every label on the half hour.
const GRID_START_MINUTES = 8 * 60;
const GRID_END_MINUTES = 20 * 60 + 30;

// A viewport-high calendar only leaves a usable grid under the controls and
// toolbar on screens that are wide and tall enough. Elsewhere (phones in
// either orientation) the whole page scrolls instead. Keep in sync with the
// arbitrary variant on the page wrapper below.
const FIXED_HEIGHT_QUERY = '(min-width: 768px) and (min-height: 600px)';

const subscribeToFixedHeight = (onChange: () => void) => {
  const mql = window.matchMedia(FIXED_HEIGHT_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

function useFixedHeightCalendar() {
  return useSyncExternalStore(
    subscribeToFixedHeight,
    () => window.matchMedia(FIXED_HEIGHT_QUERY).matches,
    () => false
  );
}

export default function BookingsPage() {
  const { room, showMine, showMineLocked, selectRoom, setShowMine } = useCalendarView();
  const [scrollTime] = useState(() => initialScrollTime(new Date(), GRID_START_MINUTES));
  const fixedHeight = useFixedHeightCalendar();

  return (
    // With a fixed height the page fills the viewport so the calendar scrolls
    // inside its card, keeping the toolbar and day headers in view. 10rem is
    // the app header plus the layout's padding and inset margin.
    <div className="flex flex-col gap-4 [@media(min-width:768px)_and_(min-height:600px)]:h-[calc(100svh-10rem)]">
      <CalendarControls
        room={room}
        showMine={showMine}
        showMineLocked={showMineLocked}
        onRoomSelect={selectRoom}
        onShowMineChange={setShowMine}
      />
      <div className="bg-card min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
        <EventCalendar
          availableViews={AVAILABLE_VIEWS}
          height={fixedHeight ? '100%' : 'auto'}
          borderless
          nowIndicator
          firstDay={1}
          allDaySlot={false}
          slotMinTime={toTime(GRID_START_MINUTES)}
          scrollTime={scrollTime}
          slotMaxTime={toTime(GRID_END_MINUTES)}
          businessHours={OPENING_HOURS}
          nonBusinessHoursClass={CLOSED_HOURS_CLASS}
        />
      </div>
    </div>
  );
}
