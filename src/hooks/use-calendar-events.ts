import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addWeeks, startOfWeek } from 'date-fns';
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

// Matches the calendar's `firstDay={1}`, so the week view always needs exactly
// one loaded week.
const WEEK_STARTS_ON = 1;

const keyOf = (week: Date) => week.toISOString();

/** The Monday-to-Monday weeks that cover a range. */
function weeksCovering({ start, end }: DateRange): DateRange[] {
  const weeks: DateRange[] = [];
  for (let week = startOfWeek(start, { weekStartsOn: WEEK_STARTS_ON }); week < end; ) {
    const next = addWeeks(week, 1);
    weeks.push({ start: week, end: next });
    week = next;
  }
  return weeks;
}

function weeksFromKey(weeksKey: string): DateRange[] {
  if (!weeksKey) return [];
  return weeksKey.split('|').map((k) => {
    const start = new Date(k);
    return { start, end: addWeeks(start, 1) };
  });
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

/**
 * Everything loaded for the given weeks, or undefined until all of them have
 * loaded. It can include bookings either side of the visible range, which the
 * calendar simply doesn't draw.
 */
function dataFor(
  loaded: ReadonlyMap<string, RangeData>,
  weeks: DateRange[]
): RangeData | undefined {
  const parts = weeks.map((week) => loaded.get(keyOf(week.start)));
  if (parts.some((part) => !part)) return undefined;
  const found = parts as RangeData[];
  // A single week is passed through as it is, so moving between its days
  // doesn't rebuild the events.
  if (found.length === 1) return found[0];
  return {
    mine: found.flatMap((d) => d.mine),
    schedules: Object.fromEntries(
      ALL_ROOMS.map((room) => [room, found.flatMap((d) => d.schedules[room])])
    ) as Record<Room, BookingView[]>,
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
 * Bookings are loaded a whole week at a time, whatever the view, and kept for
 * the session, so the day view never waits on the network for a day in a week
 * that's already loaded. Moving onto a loaded week shows it straight away while
 * it's refreshed in the background. The week after the visible range is prefetched
 * so the "next" button is instant too.
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

  // Keyed by the weeks rather than the range, so moving between days in a
  // loaded week keeps the same weeks and doesn't refetch them.
  const weeksKey = range
    ? weeksCovering(range)
        .map((week) => keyOf(week.start))
        .join('|')
    : '';
  const weeks = useMemo(() => weeksFromKey(weeksKey), [weeksKey]);

  useEffect(() => {
    if (weeks.length === 0) return;
    let current = true;

    const load = (week: DateRange) => {
      const k = keyOf(week.start);
      const pending = inFlight.current.get(k);
      if (pending) return pending;
      const request = fetchRange(week)
        .then((data) => {
          setLoaded((prev) => new Map(prev).set(k, data));
          return data;
        })
        .finally(() => inFlight.current.delete(k));
      inFlight.current.set(k, request);
      return request;
    };

    setError(null);
    Promise.all(weeks.map(load))
      .then(() => {
        if (!current) return;
        const last = weeks[weeks.length - 1];
        // Prefetching is a nice-to-have, so a failure there is ignored: the
        // week is fetched again, with errors shown, when it's navigated to.
        load({ start: last.end, end: addWeeks(last.end, 1) }).catch(() => {});
      })
      .catch(() => {
        if (current) setError('Could not load bookings.');
      });

    return () => {
      current = false;
    };
  }, [weeks]);

  // Refetches the weeks on screen now, ignoring what's loaded, so a change made
  // here (a new booking, or finding out a slot is taken) shows straight away.
  const refresh = useCallback(async () => {
    if (weeks.length === 0) return;
    try {
      const fetched = await Promise.all(weeks.map(fetchRange));
      setLoaded((prev) => {
        const next = new Map(prev);
        weeks.forEach((week, i) => next.set(keyOf(week.start), fetched[i]));
        return next;
      });
      setError(null);
    } catch {
      setError('Could not load bookings.');
    }
  }, [weeks]);

  const data = useMemo(() => dataFor(loaded, weeks), [loaded, weeks]);
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

  // Drops a cancelled booking from every loaded range, so it disappears
  // without waiting for a refetch.
  const removeBooking = useCallback((uid: string) => {
    const without = (list: BookingView[]) => list.filter((b) => b.uid !== uid);
    setLoaded(
      (prev) =>
        new Map(
          [...prev].map(([k, d]) => [
            k,
            {
              mine: without(d.mine),
              schedules: Object.fromEntries(
                Object.entries(d.schedules).map(([room, list]) => [room, without(list)])
              ) as Record<Room, BookingView[]>,
            },
          ])
        )
    );
  }, []);

  return {
    events,
    removeBooking,
    /** Every room's bookings in the weeks covering the visible range, or null until they've loaded. */
    schedules: data?.schedules ?? null,
    loading: !!range && !data && !error,
    error,
    refresh,
  };
}
