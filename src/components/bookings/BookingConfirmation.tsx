'use client';

import { format } from 'date-fns';
import { CircleCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookingView } from '@/lib/types/booking';
import { formatDuration, formatPrice } from '@/lib/utils/bookingTime';
import { CLASS_TYPE_LABELS, ROOM_LABELS } from '@/lib/utils/calendarEvents';

interface BookingConfirmationProps {
  /** The booking as the backend saved it, so the price is what's charged. */
  booking: BookingView;
  onDone: () => void;
}

/**
 * Shown in place of the booking form once a booking is made: what was booked
 * and what it costs. Lays out like the form, with the details scrolling above
 * a fixed button, so it fits the same panel or dialog.
 */
export function BookingConfirmation({ booking, onDone }: BookingConfirmationProps) {
  const from = new Date(booking.dateFrom);
  const to = new Date(booking.dateTo);
  const minutes = (to.getTime() - from.getTime()) / 60_000;

  const details: [string, string][] = [
    ['Room', ROOM_LABELS[booking.room]],
    ['Date', format(from, 'EEEE d MMMM yyyy')],
    ['Time', `${format(from, 'HH:mm')}–${format(to, 'HH:mm')} (${formatDuration(minutes)})`],
    ['Class type', CLASS_TYPE_LABELS[booking.classType]],
    ['Shareable', booking.shareable ? 'Yes' : 'No'],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="-mx-6 min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CircleCheckIcon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
          Your room is booked.
        </p>

        <dl className="divide-y rounded-lg border text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
          <div className="bg-muted/50 flex items-center justify-between gap-4 px-4 py-3">
            <dt className="font-medium">Total price</dt>
            <dd className="text-base font-semibold tabular-nums">
              {formatPrice(booking.totalPrice)}
            </dd>
          </div>
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
