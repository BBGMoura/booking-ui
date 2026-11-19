'use client';

import { format } from 'date-fns';
import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookingView } from '@/lib/types/booking';
import { formatDuration, formatPrice } from '@/lib/utils/bookingTime';
import { CLASS_TYPE_LABELS, ROOM_LABELS } from '@/lib/utils/calendarEvents';

interface BookingConfirmationProps {
  /** The booking as the backend saved it, so the price is what's charged. */
  booking: BookingView;
  onDone: () => void;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

/**
 * Shown in place of the booking form once a booking is made, styled like a
 * ticket: what was booked and what it costs. Lays out like the form, with the
 * details scrolling above a fixed button, so it fits the same panel or dialog.
 */
export function BookingConfirmation({ booking, onDone }: BookingConfirmationProps) {
  const from = new Date(booking.dateFrom);
  const to = new Date(booking.dateTo);
  const minutes = (to.getTime() - from.getTime()) / 60_000;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6 py-1">
        <div className="flex flex-col items-center pt-2 pb-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 dark:bg-emerald-950 dark:ring-emerald-950/40">
            <CheckIcon
              className="size-7 text-emerald-600 dark:text-emerald-400"
              strokeWidth={2.5}
            />
          </span>
          <p className="mt-5 text-lg font-semibold">You’re booked!</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {ROOM_LABELS[booking.room]} · {format(from, 'EEE d MMM')}, {format(from, 'HH:mm')}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-dashed py-6">
          <Detail label="Date">{format(from, 'EEE d MMM yyyy')}</Detail>
          <Detail label="Time">
            {format(from, 'HH:mm')}–{format(to, 'HH:mm')}
            <span className="text-muted-foreground block text-xs font-normal">
              {formatDuration(minutes)}
            </span>
          </Detail>
          <Detail label="Class">{CLASS_TYPE_LABELS[booking.classType]}</Detail>
          <Detail label="Shareable">{booking.shareable ? 'Yes' : 'No'}</Detail>
        </dl>

        <dl className="flex items-baseline justify-between pt-5">
          <dt className="text-muted-foreground text-sm">Total</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatPrice(booking.totalPrice)}</dd>
        </dl>
      </div>

      <div className="-mx-6 mt-4 border-t px-6 pt-4">
        <Button className="w-full" onClick={onDone} autoFocus>
          Done
        </Button>
      </div>
    </div>
  );
}
