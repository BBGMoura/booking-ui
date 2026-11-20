import type { BookingView } from '@/lib/types/booking';
import { endOf, startOf, type BookingWithEitherDates } from '@/lib/utils/calendarEvents';

interface Range {
  start: Date;
  end: Date;
}

const rangeOf = (b: BookingView): Range => ({
  start: new Date(startOf(b as BookingWithEitherDates)!),
  end: new Date(endOf(b as BookingWithEitherDates)!),
});

const overlaps = (a: Range, b: Range) => a.start < b.end && a.end > b.start;

/**
 * The room's bookings that overlap `range`, earliest first, leaving out
 * cancelled ones. Only for showing the user what's there: whether the room
 * can be booked is the backend's call (`validateBooking`).
 *
 * @param schedule the room's bookings on the day, from the schedule endpoint
 */
export function overlappingBookings(schedule: BookingView[], range: Range): BookingView[] {
  return schedule
    .filter((b) => b.status !== 'CANCELLED')
    .filter((b) => overlaps(rangeOf(b), range))
    .sort((a, b) => rangeOf(a).start.getTime() - rangeOf(b).start.getTime());
}
