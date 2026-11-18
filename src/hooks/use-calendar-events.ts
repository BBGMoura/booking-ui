import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EventInput } from '@fullcalendar/react';
import { getMyBookingsInRange, getRoomSchedule } from '@/lib/api/booking';
import { ROOMS, type BookingView, type Room } from '@/lib/types/booking';
import { buildCalendarEvents } from '@/lib/utils/calendarEvents';

export interface DateRange {
  start: Date;
  end: Date;
}

interface RangeData {
  schedules: Record<Room, BookingView[]>;
  mine: BookingView[];
}

const ALL_ROOMS = Object.values(ROOMS);
const DAY_MS = 24 * 60 * 60 * 1000;

const keyOf = (range: DateRange) => `${range.start.toISOString()}|${range.end.toISOString()}`;

/**
 * The range straight after this one, of the same length. Shifted by calendar
 * days rather than milliseconds so it still lines up with what FullCalendar
 * reports when the next range crosses a clock change.
 */
function nextRange({ start, end }: DateRange): DateRange {
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  const shift = (d: Date) => {
    const shifted = new Date(d);
    shifted.setDate(shifted.getDate() + days);
    return shifted;
  };
  return { start: shift(start), end: shift(end) };
}

async function fetchRange({ start, end }: DateRange): Promise<RangeData> {
  const from = start.toISOString();
  const to = end.toISOString();
  const [mine, ...schedules] = await Promise.all([
    getMyBookingsInRange(from, to),
    ...ALL_ROOMS.map((room) => getRoomSchedule(room, from, to)),
  ]);
  return {
    mine,
    schedules: Object.fromEntries(ALL_ROOMS.map((room, i) => [room, schedules[i]])) as Record<
      Room,
      BookingView[]
    >,
  };
}

export interface UseCalendarEventsOptions {
  /** Show who made each booking (admins only). */
  showBooker: boolean;
  /** The logged-in user's name, shown on their own bookings. */
  viewerName?: string;
}

/**
 * Loads what the calendar needs for the visible range: every room's schedule
 * and the user's own bookings, all at once. Switching rooms or the overlay
 * only re-derives events from what's loaded, so it never waits on the network.
 *
 * Loaded ranges are kept for the session: going back to one shows it straight
 * away while it's refreshed in the background. The range after the visible one
 * is prefetched so the "next" button is instant too.
 *
 * The user's own bookings are needed even with a room selected: they identify
 * which of the room's bookings are yours, since the schedule doesn't say who
 * made a booking for teachers.
 */
export function useCalendarEvents(
  room: Room | null,
  showMine: boolean,
  range: DateRange | null,
  { showBooker, viewerName }: UseCalendarEventsOptions
) {
  const [loaded, setLoaded] = useState<ReadonlyMap<string, RangeData>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(new Map<string, Promise<RangeData>>());

  const key = range ? keyOf(range) : null;

  useEffect(() => {
    if (!range || !key) return;
    let current = true;

    const load = (r: DateRange) => {
      const k = keyOf(r);
      const pending = inFlight.current.get(k);
      if (pending) return pending;
      const request = fetchRange(r)
        .then((data) => {
          setLoaded((prev) => new Map(prev).set(k, data));
          return data;
        })
        .finally(() => inFlight.current.delete(k));
      inFlight.current.set(k, request);
      return request;
    };

    setError(null);
    load(range)
      .then(() => {
        if (!current) return;
        const next = nextRange(range);
        // Prefetching is a nice-to-have, so a failure there is ignored: the
        // range is fetched again, with errors shown, when it's navigated to.
        load(next).catch(() => {});
      })
      .catch(() => {
        if (current) setError('Could not load bookings.');
      });

    return () => {
      current = false;
    };
  }, [range, key]);

  // Refetches the visible range now, ignoring what's loaded, so a change made
  // here (a new booking, or finding out a slot is taken) shows straight away.
  const refresh = useCallback(async () => {
    if (!range) return;
    try {
      const data = await fetchRange(range);
      setLoaded((prev) => new Map(prev).set(keyOf(range), data));
      setError(null);
    } catch {
      setError('Could not load bookings.');
    }
  }, [range]);

  const data = key ? loaded.get(key) : undefined;
  const events: EventInput[] = useMemo(
    () =>
      buildCalendarEvents(
        room,
        showMine,
        data && room ? data.schedules[room] : [],
        data?.mine ?? [],
        { showBooker, viewerName }
      ),
    [room, showMine, data, showBooker, viewerName]
  );

  return {
    events,
    /** Every room's bookings in the visible range, or null until they've loaded. */
    schedules: data?.schedules ?? null,
    loading: !!range && !data && !error,
    error,
    refresh,
  };
}
