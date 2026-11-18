'use client';

import type { BusinessHoursInput } from '@fullcalendar/react';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { EventCalendar } from '@/components/event-calendar';
import { useCalendarView } from '@/hooks/use-calendar-view';

const AVAILABLE_VIEWS = ['timeGridWeek', 'timeGridDay'];

// Mirrors the backend's `schedule` config, which isn't exposed over the API.
// The grid spans the earliest opening to the latest closing across all days so
// no bookable slot is cut off; per-day closed time is shaded via businessHours.
const OPENING_HOURS: BusinessHoursInput = [
  { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '19:00' },
  { daysOfWeek: [6], startTime: '09:30', endTime: '19:30' },
  { daysOfWeek: [0], startTime: '11:00', endTime: '17:00' },
];

export default function BookingsPage() {
  const { room, showMine, showMineLocked, selectRoom, setShowMine } = useCalendarView();

  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <CalendarControls
        className="bg-sidebar px-4 pt-4"
        room={room}
        showMine={showMine}
        showMineLocked={showMineLocked}
        onRoomSelect={selectRoom}
        onShowMineChange={setShowMine}
      />
      <EventCalendar
        availableViews={AVAILABLE_VIEWS}
        height="auto"
        borderless
        nowIndicator
        firstDay={1}
        allDaySlot={false}
        slotMinTime="09:00"
        slotMaxTime="19:30"
        businessHours={OPENING_HOURS}
      />
    </div>
  );
}
