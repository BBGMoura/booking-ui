import { formatISO } from 'date-fns';

export const MIN_BOOKING_MINUTES = 15;
export const BOOKING_INTERVAL_MINUTES = 5;

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

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

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
