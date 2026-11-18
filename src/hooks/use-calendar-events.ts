import { useEffect, useMemo, useState } from 'react';
import type { EventInput } from '@fullcalendar/react';
import { getMyBookingsInRange, getRoomSchedule } from '@/lib/api/booking';
import type { BookingView, Room } from '@/lib/types/booking';
import { buildCalendarEvents } from '@/lib/utils/calendarEvents';

export interface DateRange {
  start: Date;
  end: Date;
}

interface Fetched {
  key: string;
  schedule: BookingView[];
  mine: BookingView[];
}

/**
 * Fetches what the calendar needs for the current room, overlay and visible
 * range, and refetches whenever any of them change. The user's own bookings
 * are always fetched: with a room selected they identify which of the room's
 * bookings are yours, since the schedule doesn't say who made a booking.
 */
export function useCalendarEvents(room: Room | null, showMine: boolean, range: DateRange | null) {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [error, setError] = useState<string | null>(null);

  const from = range?.start.toISOString();
  const to = range?.end.toISOString();
  const key = `${room}|${from}|${to}`;

  useEffect(() => {
    if (!from || !to) return;
    let stale = false;
    setError(null);
    Promise.all([room ? getRoomSchedule(room, from, to) : [], getMyBookingsInRange(from, to)])
      .then(([schedule, mine]) => {
        if (!stale) setFetched({ key, schedule, mine });
      })
      .catch(() => {
        if (!stale) setError('Could not load bookings.');
      });
    return () => {
      stale = true;
    };
  }, [room, from, to, key]);

  // Ignore data fetched for a different room/range so stale bookings never
  // render under the new selection while the new fetch is in flight.
  const current = fetched?.key === key ? fetched : null;
  const events: EventInput[] = useMemo(
    () => buildCalendarEvents(room, showMine, current?.schedule ?? [], current?.mine ?? []),
    [room, showMine, current]
  );

  return { events, loading: !!range && !current && !error, error };
}
