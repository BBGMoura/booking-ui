import { useCallback, useEffect, useRef, useState } from 'react';
import { getBookings } from '@/lib/api/booking';
import type { BookingView, Page } from '@/lib/types/booking';
import { parseApiError } from '@/lib/utils/errorUtils';

export type BookingsTab = 'upcoming' | 'past';

export const MY_BOOKINGS_PAGE_SIZE = 10;

/**
 * One page of the user's own bookings for a tab. "Now" is worked out here and
 * held for the life of the hook, so paging through a tab doesn't shift items
 * between pages as the clock moves.
 */
export function useMyBookings(tab: BookingsTab) {
  const [now] = useState(() => new Date().toISOString());
  const [pageIndex, setPageIndex] = useState(0);
  const [data, setData] = useState<Page<BookingView> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // Resetting loading/error as a request starts is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    getBookings({
      ...(tab === 'upcoming' ? { dateFrom: now, order: 'ASC' } : { dateTo: now, order: 'DESC' }),
      page: pageIndex,
      size: MY_BOOKINGS_PAGE_SIZE,
    })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(parseApiError(e));
        setLoading(false);
      });
  }, [tab, now, pageIndex, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Updated in place rather than reloaded, so the card stays where it was.
  const markCancelled = useCallback(
    (uid: string) =>
      setData((current) =>
        current
          ? {
              ...current,
              content: current.content.map((b) =>
                b.uid === uid ? { ...b, status: 'CANCELLED' } : b
              ),
            }
          : current
      ),
    []
  );

  return { data, error, loading, pageIndex, setPageIndex, retry, markCancelled };
}
