'use client';

import { useRef, useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cancelBooking } from '@/lib/api/booking';
import type { BookingView } from '@/lib/types/booking';
import { CLASS_TYPE_LABELS, ROOM_LABELS } from '@/lib/utils/calendarEvents';
import { parseApiError } from '@/lib/utils/errorUtils';
import { cn } from '@/lib/utils';

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short' });
const fullDateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

interface BookingCardProps {
  booking: BookingView;
  /**
   * Shows a Cancel button when given. The caller decides which bookings may be
   * cancelled; the card only hides the button once a booking is cancelled.
   */
  onCancelled?: (uid: string) => void;
}

/**
 * A booking with everything on show at once: there are only a few facts, so
 * hiding some behind an expand step cost a click for no real saving in space.
 * The date sits in its own block so a list of cards can be scanned by date.
 * Only cancelled bookings get a status label.
 */
export function BookingCard({ booking, onCancelled }: BookingCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const from = new Date(booking.dateFrom);
  const to = new Date(booking.dateTo);
  const cancelled = booking.status === 'CANCELLED';
  const articleRef = useRef<HTMLElement>(null);
  // The year only earns space when it isn't this one, which mostly happens in Past.
  const otherYear = from.getFullYear() !== new Date().getFullYear();

  // The backend lets a booking be cancelled at any time, so the "not once it
  // has started" rule lives here, as in the calendar's booking details. It's
  // checked again on confirm because the page can sit open past the start.
  const canCancel = !!onCancelled && !cancelled && from.getTime() > Date.now();

  async function confirmCancel() {
    if (cancelling) return;
    if (from.getTime() <= Date.now()) {
      setError("This booking has started, so it can't be cancelled.");
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      await cancelBooking(booking.uid);
      toast.success('Booking cancelled');
      setConfirming(false);
      onCancelled?.(booking.uid);
      // The buttons go once the booking is cancelled, so keep keyboard and
      // screen reader users on this card instead of dropping to the page top.
      articleRef.current?.focus();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <article
      ref={articleRef}
      tabIndex={-1}
      aria-label={`${fullDateFormat.format(from)}, ${timeFormat.format(from)} to ${timeFormat.format(to)}`}
      className={cn(
        'bg-card rounded-xl border p-4 shadow-xs outline-none',
        cancelled && 'bg-muted/40'
      )}
    >
      <div className="flex gap-4">
        <div
          aria-hidden
          className={cn(
            'bg-primary text-primary-foreground flex w-16 shrink-0 flex-col items-center justify-center self-start rounded-lg py-2 leading-none',
            cancelled && 'bg-muted text-muted-foreground'
          )}
        >
          <span className="text-xs font-medium uppercase opacity-80">
            {weekdayFormat.format(from)}
          </span>
          <span className="my-1 text-2xl font-semibold tabular-nums">{dayFormat.format(from)}</span>
          <span className="text-xs font-medium uppercase">
            {monthFormat.format(from)}
            {otherYear && ` ${from.getFullYear()}`}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <p
              className={cn(
                'font-semibold tabular-nums',
                cancelled && 'text-muted-foreground line-through'
              )}
            >
              {timeFormat.format(from)}–{timeFormat.format(to)}
            </p>
            <p className="text-sm font-medium tabular-nums">
              <span className="sr-only">Price </span>£{booking.totalPrice.toFixed(2)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{ROOM_LABELS[booking.room]}</span>
            <Badge variant="secondary">{CLASS_TYPE_LABELS[booking.classType]}</Badge>
            {booking.shareable && (
              <Badge variant="secondary">
                <Users aria-hidden />
                Shared room
              </Badge>
            )}
            {cancelled && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Cancelled
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-muted-foreground min-w-0 font-mono text-xs break-all">
              <span className="font-sans">Ref </span>
              {booking.uid}
            </p>
            {canCancel && (
              <div className="-my-1 -mr-2 ml-auto">
                {confirming ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <p className="text-sm">Cancel this booking? This can&apos;t be undone.</p>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={cancelling}
                        onClick={() => {
                          setConfirming(false);
                          setError(null);
                        }}
                      >
                        Keep
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancelling}
                        onClick={confirmCancel}
                        autoFocus
                      >
                        Yes, cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    // "Cancel" alone could read as "close this" to a screen reader.
                    aria-label="Cancel booking"
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2 aria-hidden />
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      )}
    </article>
  );
}
