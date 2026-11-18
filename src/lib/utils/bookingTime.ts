import { formatISO, startOfDay } from 'date-fns';

export const MIN_BOOKING_MINUTES = 15;
export const BOOKING_INTERVAL_MINUTES = 5;
/** The step between the times offered in the booking form and when dragging on the grid. */
export const TIME_STEP_MINUTES = 15;
const DEFAULT_BOOKING_MINUTES = 60;

export interface OpeningHours {
  /** Minutes after midnight. */
  open: number;
  close: number;
}

const WEEKDAY: OpeningHours = { open: 9 * 60, close: 19 * 60 };
const SATURDAY: OpeningHours = { open: 9 * 60 + 30, close: 19 * 60 + 30 };
const SUNDAY: OpeningHours = { open: 11 * 60, close: 17 * 60 };

/**
 * Opening hours by day of the week (0 = Sunday), mirroring the backend's
 * `schedule` config, which isn't exposed over the API.
 */
export const OPENING_HOURS_BY_DAY: readonly OpeningHours[] = [
  SUNDAY,
  WEEKDAY,
  WEEKDAY,
  WEEKDAY,
  WEEKDAY,
  WEEKDAY,
  SATURDAY,
];

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

const isAligned = (d: Date) =>
  d.getSeconds() === 0 &&
  d.getMilliseconds() === 0 &&
  d.getMinutes() % BOOKING_INTERVAL_MINUTES === 0;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Checks a booking's time range against the backend's `BookingTimeValidator`
 * rules, in the same order, so a request that's certain to be rejected is
 * never sent. Times are read in the browser's local time, which is also the
 * offset `toOffsetDateTime` sends them in.
 *
 * @return the first broken rule as a message for the user, or null if the range is valid
 */
export function validateBookingTime(start: Date, end: Date): string | null {
  const durationMinutes = (end.getTime() - start.getTime()) / 60_000;

  if (durationMinutes <= 0) return 'The start time must be before the end time.';
  if (durationMinutes < MIN_BOOKING_MINUTES)
    return `A booking must be at least ${MIN_BOOKING_MINUTES} minutes.`;
  if (!isAligned(start) || !isAligned(end))
    return `Start and end times must be on a ${BOOKING_INTERVAL_MINUTES}-minute interval.`;
  if (!isSameDay(start, end)) return 'A booking must start and end on the same day.';

  const { open, close } = OPENING_HOURS_BY_DAY[start.getDay()];
  const from = minutesOfDay(start);
  const to = minutesOfDay(end);
  if (from < open || from >= close || to < open || to > close)
    return 'A booking must be within opening hours.';

  return null;
}

/**
 * Formats a date as an ISO 8601 date-time with its local UTC offset (e.g.
 * `2026-11-18T10:00:00+00:00`). The backend reads opening hours from the local
 * time in the offset it's sent, so a UTC `toISOString()` would shift them.
 */
export const toOffsetDateTime = (d: Date) => formatISO(d);

/** The booking's length in hours, for pricing. */
export const durationInHours = (start: Date, end: Date) =>
  (end.getTime() - start.getTime()) / 3_600_000;

const PRICE_FORMAT = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export const formatPrice = (amount: number) => PRICE_FORMAT.format(amount);

/** The date at `minutes` after midnight on `day`. */
export const atMinutes = (day: Date, minutes: number) => {
  const d = startOfDay(day);
  d.setHours(0, minutes);
  return d;
};

export const openingHoursOn = (day: Date) => OPENING_HOURS_BY_DAY[day.getDay()];

/**
 * The start times the booking form offers on `day`: every step from opening
 * until the last one that leaves room for the shortest booking.
 */
export function startTimeOptions(day: Date): number[] {
  const { open, close } = openingHoursOn(day);
  const times = [];
  for (let t = open; t + MIN_BOOKING_MINUTES <= close; t += TIME_STEP_MINUTES) times.push(t);
  return times;
}

/** The end times the booking form offers on `day` for a booking starting at `start`. */
export function endTimeOptions(day: Date, start: number): number[] {
  const { close } = openingHoursOn(day);
  const times = [];
  for (let t = start + MIN_BOOKING_MINUTES; t <= close; t += TIME_STEP_MINUTES) times.push(t);
  return times;
}

/**
 * The slot the booking form starts with when it isn't opened from a dragged
 * range: an hour from the next full hour (or from opening, if that's later),
 * or no time at all if an hour no longer fits before closing.
 */
export function defaultBookingSlot(day: Date, now: Date): { start: number; end: number } | null {
  const { open, close } = openingHoursOn(day);
  const isToday = startOfDay(day).getTime() === startOfDay(now).getTime();
  const nextHour = (Math.floor(minutesOfDay(now) / 60) + 1) * 60;
  const start = Math.max(open, isToday ? nextHour : open);
  const end = start + DEFAULT_BOOKING_MINUTES;
  return end <= close ? { start, end } : null;
}

/** A length of time for people to read, e.g. `1 hr 30 min`. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
