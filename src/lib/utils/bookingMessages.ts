import { format } from 'date-fns';
import type { BookingView } from '@/lib/types/booking';
import { type BookingConflict, MAX_SHAREABLE_BOOKINGS } from '@/lib/utils/bookingConflicts';
import { endOf, startOf, type BookingWithEitherDates } from '@/lib/utils/calendarEvents';

export const NOT_FREE_MESSAGE =
  'This time overlaps another booking in the room. Choose another time.';
export const SHAREABLE_FULL_MESSAGE = `This time already has ${MAX_SHAREABLE_BOOKINGS} shareable bookings. Choose another time.`;
export const HIGH_DEMAND_MESSAGE = 'We are experiencing high demand. Please try again.';

const formatRange = (b: BookingView) =>
  `${format(new Date(startOf(b as BookingWithEitherDates)!), 'HH:mm')}–${format(new Date(endOf(b as BookingWithEitherDates)!), 'HH:mm')}`;

/** What to tell the user about a clash, naming the bookings in the way. */
export function conflictMessage(conflict: BookingConflict, isShareable: boolean): string {
  if (conflict.code === 'BOOKING_SHAREABLE_LIMIT') return SHAREABLE_FULL_MESSAGE;
  const [first, ...rest] = conflict.bookings;
  const more = rest.length > 0 ? ` and ${rest.length} more` : '';
  if (!isShareable && conflict.bookings.every((b) => b.shareable)) {
    return `Overlaps a shareable booking (${formatRange(first)})${more}. Turn on Shareable to share the room, or choose another time.`;
  }
  return `Overlaps a booking (${formatRange(first)})${more}. Choose another time.`;
}
