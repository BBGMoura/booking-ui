'use client';

import { useState } from 'react';
import type { BusinessHoursInput } from '@fullcalendar/react';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { EventCalendar } from '@/components/event-calendar';
import { useCalendarView } from '@/hooks/use-calendar-view';
import { initialScrollTime, toTime } from '@/lib/utils/calendarUtils';

const AVAILABLE_VIEWS = ['timeGridWeek', 'timeGridDay'];

// Mirrors the backend's `schedule` config, which isn't exposed over the API.
// The grid runs a little wider than the widest opening hours so the edges of the
// day read as closed time rather than being cut off; per-day closed time is
// shaded via businessHours.
const OPENING_HOURS: BusinessHoursInput = [
  { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '19:00' },
  { daysOfWeek: [6], startTime: '09:30', endTime: '19:30' },
  { daysOfWeek: [0], startTime: '11:00', endTime: '17:00' },
];

const CLOSED_HOURS_CLASS = 'bg-muted/60';

const GRID_START_HOUR = 7;

export default function BookingsPage() {
  const { room, showMine, showMineLocked, selectRoom, setShowMine } = useCalendarView();
  const [scrollTime] = useState(() => initialScrollTime(new Date(), GRID_START_HOUR));

  return (
    // The page fills the viewport so the calendar scrolls inside its card,
    // keeping the toolbar and day headers in view. 9rem/10rem is the app
    // header plus the layout's padding (and the inset margin from md up); the
    // min height stops the grid collapsing on landscape phones, where the page
    // scrolls instead.
    <div className="flex h-[calc(100svh-9rem)] min-h-[32rem] flex-col gap-4 md:h-[calc(100svh-10rem)]">
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
          height="100%"
          borderless
          nowIndicator
          firstDay={1}
          allDaySlot={false}
          slotMinTime={toTime(GRID_START_HOUR)}
          scrollTime={scrollTime}
          slotMaxTime="20:00"
          businessHours={OPENING_HOURS}
          nonBusinessHoursClass={CLOSED_HOURS_CLASS}
        />
      </div>
    </div>
  );
}
