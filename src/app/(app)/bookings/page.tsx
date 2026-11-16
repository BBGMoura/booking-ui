'use client';

import { CalendarControls } from '@/components/bookings/CalendarControls';
import { EventCalendar } from '@/components/event-calendar';
import { useCalendarView } from '@/hooks/use-calendar-view';

const AVAILABLE_VIEWS = ['timeGridWeek', 'timeGridDay'];

export default function BookingsPage() {
  const { room, showMine, showMineLocked, selectRoom, setShowMine } = useCalendarView();

  return (
    <div className="flex flex-col gap-4">
      <CalendarControls
        room={room}
        showMine={showMine}
        showMineLocked={showMineLocked}
        onRoomSelect={selectRoom}
        onShowMineChange={setShowMine}
      />
      <EventCalendar availableViews={AVAILABLE_VIEWS} height="auto" nowIndicator />
    </div>
  );
}
