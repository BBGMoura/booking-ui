import { useCallback, useEffect, useRef, useState } from 'react';
import { getBookings, getUserBookings } from '@/lib/api/booking';
import type { BookingView, GetBookingsParams, Page } from '@/lib/types/booking';
import { parseApiError } from '@/lib/utils/errorUtils';

export type BookingsTab = 'upcoming' | 'past';

export const MY_BOOKINGS_PAGE_SIZE = 10;

/**
 * One page of the user's own bookings for a tab, or of another user's when an
 * admin passes `userUid`.
 *
 * "Now" is worked out here and held while the user pages through, so items
 * don't shift between pages as the clock moves. It moves on, and the page is
 * reloaded quietly, when the user comes back to the browser tab: that's when
 * bookings that have started since need to move from Upcoming to Past, and
 * when a cancellation made elsewhere (by an admin) should show.
 *
 * Unlike the Room calendar there's no timed poll: only the user (and rarely an
 * admin) changes these bookings, so a refresh on return is enough.
 */
export function useMyBookings(tab: BookingsTab, userUid?: string) {
  const [now, setNow] = useState(() => new Date().toISOString());
  const [pageIndex, setPageIndex] = useState(0);
  const [data, setData] = useState<Page<BookingView> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);
  // A refresh on return leaves the list as it is until the new page arrives,
  // and keeps it if the refresh fails; the next return tries again.
  const quiet = useRef(false);

  useEffect(() => {
    const id = ++requestId.current;
    const background = quiet.current;
    quiet.current = false;
    if (!background) {
      // Resetting loading/error as a request starts is what this effect is for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      setError(null);
    }
    const params: GetBookingsParams = {
      ...(tab === 'upcoming' ? { dateFrom: now, order: 'ASC' } : { dateTo: now, order: 'DESC' }),
      page: pageIndex,
      size: MY_BOOKINGS_PAGE_SIZE,
    };
    (userUid ? getUserBookings(userUid, params) : getBookings(params))
      .then((result) => {
        if (id !== requestId.current) return;
        // Bookings moving to Past can leave the user on a page that no longer
        // exists; go to the last one that does.
        if (result.content.length === 0 && pageIndex > 0) {
          setPageIndex(Math.max(0, result.page.totalPages - 1));
          return;
        }
        setData(result);
        setLoading(false);
      })
      .catch((e) => {
        if (id !== requestId.current || background) return;
        setError(parseApiError(e));
        setLoading(false);
      });
  }, [tab, userUid, now, pageIndex, attempt]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      quiet.current = true;
      setNow(new Date().toISOString());
    };
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, []);

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
