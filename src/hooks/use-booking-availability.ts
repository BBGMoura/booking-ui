import { useCallback, useState } from 'react';
import type { Notice } from '@/components/bookings/BookingNotice';
import type { BookingView, Room } from '@/lib/types/booking';
import { findConflict } from '@/lib/utils/bookingConflicts';
import {
  conflictMessage,
  NOT_FREE_MESSAGE,
  SHAREABLE_FULL_MESSAGE,
} from '@/lib/utils/bookingMessages';
import { atMinutes } from '@/lib/utils/bookingTime';

interface BookingAvailabilityOptions {
  room: Room | undefined;
  date: Date | undefined;
  /** Minutes after midnight; null while unchosen. */
  start: number | null;
  end: number | null;
  isShareable: boolean;
  /** The room's bookings around the day, or null while they're loading. */
  schedule: BookingView[] | null;
  /** Changes whenever any choice does, so a refusal only shows for its own choices. */
  choiceKey: string;
}

/**
 * Whether the booking in the form can be made: a clash with the room's
 * schedule while the user is choosing (the backend still decides), and the
 * backend's refusal once they've tried.
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
  isShareable,
  schedule,
  choiceKey,
}: BookingAvailabilityOptions) {
  // A booking the backend refused, tagged with the choices it was for, so the
  // error clears as soon as the user changes any of them.
  const [rejection, setRejection] = useState<{ key: string; message: string } | null>(null);

  const hasTime = !!date && start != null && end != null && end > start;
  const localConflict =
    schedule && room && hasTime
      ? findConflict(schedule, {
          start: atMinutes(date, start),
          end: atMinutes(date, end),
          isShareable,
        })
      : null;
  const clash = localConflict && conflictMessage(localConflict, isShareable);
  const rejected = rejection?.key === choiceKey ? rejection.message : null;
  const notice: Notice = rejected
    ? // The reloaded schedule says what's in the way, when it shows the clash.
      { tone: 'error', message: clash ?? rejected }
    : clash
      ? { tone: 'warning', message: clash }
      : schedule && hasTime && room
        ? { tone: 'free', room }
        : null;

  const reject = useCallback(
    (code: string) =>
      setRejection({
        key: choiceKey,
        message: code === 'BOOKING_CONFLICT' ? NOT_FREE_MESSAGE : SHAREABLE_FULL_MESSAGE,
      }),
    [choiceKey]
  );

  return { notice, reject };
}
