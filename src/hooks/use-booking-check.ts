import { useEffect, useState } from 'react';
import { validateBooking } from '@/lib/api/booking';
import type { CreateBookingData } from '@/lib/types/booking';
import { getApiErrorInfo, parseApiError } from '@/lib/utils/errorUtils';

/** How long the choices must stay still before the backend is asked. */
export const BOOKING_CHECK_DELAY_MS = 400;

export type BookingCheck =
  | { state: 'checking' }
  | { state: 'free' }
  /** The backend would refuse it, with this `error` code and message. */
  | { state: 'refused'; code: string; message: string }
  /** The check itself failed (offline, server error, …); creating will report it. */
  | { state: 'unknown' };

/**
 * Asks the backend whether it would accept `booking` as it stands, once the
 * user stops changing it, so a clash shows before they press Book. The answer
 * is a snapshot: the backend still decides when the booking is made.
 *
 * @param booking what would be sent to create the booking, or null while it
 *     isn't complete enough to check
 * @return the answer for exactly this booking, or null if there's nothing to check
 */
export function useBookingCheck(booking: CreateBookingData | null): BookingCheck | null {
  // Compared by value, so a re-render with the same choices doesn't ask again.
  const key = booking && JSON.stringify(booking);
  const [answer, setAnswer] = useState<{ key: string; check: BookingCheck } | null>(null);

  useEffect(() => {
    if (!key) return;
    let current = true;
    const timer = setTimeout(() => {
      validateBooking(JSON.parse(key))
        .then(() => {
          if (current) setAnswer({ key, check: { state: 'free' } });
        })
        .catch((exception) => {
          if (!current) return;
          const { status, code } = getApiErrorInfo(exception);
          setAnswer({
            key,
            check:
              status === 400 && code
                ? { state: 'refused', code, message: parseApiError(exception) }
                : { state: 'unknown' },
          });
        });
    }, BOOKING_CHECK_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [key]);

  if (!key) return null;
  return answer?.key === key ? answer.check : { state: 'checking' };
}
