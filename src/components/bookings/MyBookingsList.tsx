'use client';

import Link from 'next/link';
import { cancelBookingAsAdmin } from '@/lib/api/booking';
import { BookingCard } from '@/components/bookings/BookingCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBookings, type BookingsTab } from '@/hooks/use-my-bookings';

const EMPTY_TEXT: Record<BookingsTab, string> = {
  upcoming: 'No upcoming bookings',
  past: 'No past bookings',
};

/**
 * One tab of My Bookings: the user's own bookings, 10 to a page. With `userUid`
 * it shows that user's bookings instead, for admins, who cancel through the admin endpoint.
 */
export function MyBookingsList({ tab, userUid }: { tab: BookingsTab; userUid?: string }) {
  const { data, error, loading, pageIndex, setPageIndex, retry, markCancelled } = useMyBookings(
    tab,
    userUid
  );

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-6">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading bookings">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (data.content.length === 0 && pageIndex === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground">{EMPTY_TEXT[tab]}</p>
        {tab === 'upcoming' && !userUid && (
          <Button asChild>
            <Link href="/calendar">Book a room</Link>
          </Button>
        )}
      </div>
    );
  }

  const { number, totalPages } = data.page;

  return (
    <div className="space-y-4">
      <ul className={loading ? 'space-y-3 opacity-60' : 'space-y-3'} aria-busy={loading}>
        {data.content.map((booking) => (
          <li key={booking.uid}>
            <BookingCard
              booking={booking}
              cancel={userUid ? cancelBookingAsAdmin : undefined}
              // Past bookings have already started, and those can't be cancelled.
              onCancelled={tab === 'upcoming' ? markCancelled : undefined}
            />
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={loading || number <= 0}
            onClick={() => setPageIndex(number - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {number + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={loading || number >= totalPages - 1}
            onClick={() => setPageIndex(number + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
