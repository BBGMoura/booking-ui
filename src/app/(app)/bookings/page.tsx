'use client';

import { useState } from 'react';
import type { BusinessHoursInput } from '@fullcalendar/react';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';
import { useCalendarView } from '@/hooks/use-calendar-view';
import { useFixedHeightLayout } from '@/hooks/use-fixed-height-layout';
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

export default function BookingsPage() {
  const { room, showMine, showMineLocked, selectRoom, setShowMine } = useCalendarView();
  const [scrollTime] = useState(() => initialScrollTime(new Date(), GRID_START_MINUTES));
  const fixedHeight = useFixedHeightLayout();

  return (
    // When the layout is locked to the viewport, the page takes the remaining
    // height and the calendar scrolls inside its card, keeping the toolbar and
    // day headers in view. Otherwise (phones) the calendar is full height and
    // the whole page scrolls, since a viewport-high grid would be too short.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <CalendarControls
        room={room}
        showMine={showMine}
        showMineLocked={showMineLocked}
        onRoomSelect={selectRoom}
        onShowMineChange={setShowMine}
      />
      <div className="bg-card min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
        <BookingsCalendar
          availableViews={AVAILABLE_VIEWS}
          height={fixedHeight ? '100%' : 'auto'}
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
