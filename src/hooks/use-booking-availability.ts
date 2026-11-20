import { useCallback, useState } from 'react';
import type { Notice } from '@/components/bookings/BookingNotice';
import { useBookingCheck } from '@/hooks/use-booking-check';
import type { BookingView, ClassType, Room } from '@/lib/types/booking';
import {
  NOT_FREE_MESSAGE,
  refusalMessage,
  SHAREABLE_FULL_MESSAGE,
} from '@/lib/utils/bookingMessages';
import { overlappingBookings } from '@/lib/utils/bookingOverlaps';
import { atMinutes, toOffsetDateTime, validateBookingTime } from '@/lib/utils/bookingTime';

interface BookingAvailabilityOptions {
  room: Room | undefined;
  date: Date | undefined;
  /** Minutes after midnight; null while unchosen. */
  start: number | null;
  end: number | null;
  classType: ClassType | undefined;
  isShareable: boolean;
  /** The room's bookings around the day, or null while they're loading. */
  schedule: BookingView[] | null;
  /** Changes whenever any choice does, so a refusal only shows for its own choices. */
  choiceKey: string;
}

/**
 * Whether the booking in the form can be made: the backend's answer while the
 * user is choosing, and its refusal once they've tried. Both name the bookings
 * in the way when the schedule shows them.
 *
 * @return `notice` for the line above the button (null when there's nothing to
 *     say), and `reject`, to call when creating the booking was refused with a
 *     `BOOKING_CONFLICT` or `BOOKING_SHAREABLE_LIMIT` code
 */
export function useBookingAvailability({
  room,
  date,
  start,
  end,
  classType,
  isShareable,
  schedule,
  choiceKey,
}: BookingAvailabilityOptions) {
  // A booking the backend refused, tagged with the choices it was for, so the
  // error clears as soon as the user changes any of them.
  const [rejection, setRejection] = useState<{
    key: string;
    code: string;
    message: string;
  } | null>(null);

  const hasTime = !!date && start != null && end != null && end > start;
  const from = hasTime ? atMinutes(date, start) : null;
  const to = hasTime ? atMinutes(date, end) : null;
  // Only ask about a booking the form itself would send: the schema already
  // explains anything else next to the field.
  const checkable =
    room && classType && from && to && from >= new Date() && !validateBookingTime(from, to);
  const check = useBookingCheck(
    checkable
      ? {
          room,
          classType,
          isShareable,
          dateFrom: toOffsetDateTime(from),
          dateTo: toOffsetDateTime(to),
        }
      : null
  );
  const overlapping =
    schedule && from && to ? overlappingBookings(schedule, { start: from, end: to }) : null;
  const refusal = (code: string, fallback: string) =>
    refusalMessage(code, overlapping, isShareable, fallback);

  const rejected = rejection?.key === choiceKey ? rejection : null;
  const notice: Notice = rejected
    ? // The reloaded schedule says what's in the way, when it shows the clash.
      { tone: 'error', message: refusal(rejected.code, rejected.message) }
    : check?.state === 'refused'
      ? { tone: 'warning', message: refusal(check.code, check.message) }
      : room && check?.state === 'free'
        ? { tone: 'free', room }
        : room && check?.state === 'checking'
          ? { tone: 'checking', room }
          : null;

  const reject = useCallback(
    (code: string) =>
      setRejection({
        key: choiceKey,
        code,
        message: code === 'BOOKING_CONFLICT' ? NOT_FREE_MESSAGE : SHAREABLE_FULL_MESSAGE,
      }),
    [choiceKey]
  );

  return { notice, reject };
}
