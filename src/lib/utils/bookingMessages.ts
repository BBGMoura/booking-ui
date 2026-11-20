import { format } from 'date-fns';
import type { BookingView } from '@/lib/types/booking';
import { endOf, startOf, type BookingWithEitherDates } from '@/lib/utils/calendarEvents';

// Only for the message: the backend enforces the limit.
const MAX_SHAREABLE_BOOKINGS = 3;

export const NOT_FREE_MESSAGE =
  'This time overlaps another booking in the room. Choose another time.';
export const SHAREABLE_FULL_MESSAGE = `This time already has ${MAX_SHAREABLE_BOOKINGS} shareable bookings. Choose another time.`;
export const HIGH_DEMAND_MESSAGE = 'We are experiencing high demand. Please try again.';

const formatRange = (b: BookingView) =>
  `${format(new Date(startOf(b as BookingWithEitherDates)!), 'HH:mm')}–${format(new Date(endOf(b as BookingWithEitherDates)!), 'HH:mm')}`;

/**
 * What to tell the user about a booking the backend refuses (or would refuse)
 * with `code`. For a clash it names the bookings in the way when the schedule
 * shows them, falling back to a general message when it doesn't (yet).
 *
 * @param overlapping the room's bookings overlapping the chosen time, or null
 *     while the schedule is loading
 * @param fallback what to say for a code with no message of its own here
 */
export function refusalMessage(
  code: string,
  overlapping: BookingView[] | null,
  isShareable: boolean,
  fallback: string
): string {
  if (code === 'BOOKING_SHAREABLE_LIMIT') return SHAREABLE_FULL_MESSAGE;
  if (code !== 'BOOKING_CONFLICT') return fallback;
  if (!overlapping?.length) return NOT_FREE_MESSAGE;
  // A booking that isn't shareable is in the way of any other; shareable ones
  // only block a booking that isn't shareable.
  const exclusive = overlapping.filter((b) => !b.shareable);
  const inTheWay = exclusive.length > 0 ? exclusive : overlapping;
  const [first, ...rest] = inTheWay;
  const more = rest.length > 0 ? ` and ${rest.length} more` : '';
  if (!isShareable && exclusive.length === 0) {
    return `Overlaps a shareable booking (${formatRange(first)})${more}. Turn on Shareable to share the room, or choose another time.`;
  }
  return `Overlaps a booking (${formatRange(first)})${more}. Choose another time.`;
}
