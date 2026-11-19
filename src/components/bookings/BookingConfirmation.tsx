'use client';

import type { ReactNode } from 'react';
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

function Row({
  label,
  children,
  total = false,
}: {
  label: string;
  children: ReactNode;
  total?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={total ? 'font-medium' : 'text-muted-foreground'}>{label}</dt>
      <dd className={total ? 'text-lg font-semibold tabular-nums' : 'text-right font-medium'}>
        {children}
      </dd>
    </div>
  );
}

/**
 * Shown in place of the booking form once a booking is made: what was booked
 * and what it costs, in a grey card like the form's price estimate, with the
 * total torn off below a dashed line like a ticket stub. Lays out like the
 * form, with the details scrolling above a fixed button, so it fits the same
 * panel or dialog.
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
            Here are the details of your booking.
          </p>
        </div>

        <dl className="bg-muted/60 space-y-3 rounded-xl p-4 text-sm">
          <Row label="Room">{ROOM_LABELS[booking.room]}</Row>
          <Row label="Date">{format(from, 'EEE d MMM yyyy')}</Row>
          <Row label="Time">
            {format(from, 'HH:mm')}–{format(to, 'HH:mm')}
            <span className="text-muted-foreground font-normal"> · {formatDuration(minutes)}</span>
          </Row>
          <Row label="Class">{CLASS_TYPE_LABELS[booking.classType]}</Row>
          <Row label="Shareable">{booking.shareable ? 'Yes' : 'No'}</Row>
          <div className="border-t border-dashed pt-3">
            <Row label="Total" total>
              {formatPrice(booking.totalPrice)}
            </Row>
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
