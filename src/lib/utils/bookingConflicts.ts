import type { BookingView } from '@/lib/types/booking';
import { BOOKING_INTERVAL_MINUTES } from '@/lib/utils/bookingTime';
import { endOf, startOf, type BookingWithEitherDates } from '@/lib/utils/calendarEvents';

export const MAX_SHAREABLE_BOOKINGS = 3;

export interface BookingConflict {
  /** The error code the backend would answer with. */
  code: 'BOOKING_CONFLICT' | 'BOOKING_SHAREABLE_LIMIT';
  /** The existing bookings in the way, earliest first. */
  bookings: BookingView[];
}

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
 * Checks a new booking against the room's existing ones with the backend's
 * rules (`NonShareableConflictValidator`, then `ShareabilityLimitValidator`),
 * so a clash shows while the user is still choosing the time. The backend
 * still decides: someone can book in between.
 *
 * @param schedule the room's bookings on the day, from the schedule endpoint
 * @return the first rule broken, or null if the room looks free
 */
export function findConflict(
  schedule: BookingView[],
  booking: Range & { isShareable: boolean }
): BookingConflict | null {
  const overlapping = schedule
    .filter((b) => b.status !== 'CANCELLED')
    .filter((b) => overlaps(rangeOf(b), booking))
    .sort((a, b) => rangeOf(a).start.getTime() - rangeOf(b).start.getTime());

  const exclusive = overlapping.filter((b) => !b.shareable);
  if (exclusive.length > 0) return { code: 'BOOKING_CONFLICT', bookings: exclusive };

  if (!booking.isShareable) {
    return overlapping.length > 0 ? { code: 'BOOKING_CONFLICT', bookings: overlapping } : null;
  }

  // Shareable bookings may overlap, but no more than the limit at any moment.
  // The backend checks in 5-minute steps, and so does this.
  const step = BOOKING_INTERVAL_MINUTES * 60_000;
  for (let t = booking.start.getTime(); t < booking.end.getTime(); t += step) {
    const slot = { start: new Date(t), end: new Date(t + step) };
    const sharing = overlapping.filter((b) => overlaps(rangeOf(b), slot));
    if (sharing.length >= MAX_SHAREABLE_BOOKINGS) {
      return { code: 'BOOKING_SHAREABLE_LIMIT', bookings: sharing };
    }
  }
  return null;
}
