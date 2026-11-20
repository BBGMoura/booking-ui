'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { BookingView } from '@/lib/types/booking';
import { CLASS_TYPE_LABELS, ROOM_LABELS } from '@/lib/utils/calendarEvents';
import { cn } from '@/lib/utils';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

interface BookingCardProps {
  booking: BookingView;
}

/**
 * A booking as a card that expands for more. Collapsed it shows when, where and
 * what for; expanded it adds the price, shared room and booking reference.
 * Only cancelled bookings get a status label.
 */
export function BookingCard({ booking }: BookingCardProps) {
  const [open, setOpen] = useState(false);
  const from = new Date(booking.dateFrom);
  const to = new Date(booking.dateTo);
  const cancelled = booking.status === 'CANCELLED';

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-card rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-start gap-3 p-4 text-left">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('font-medium', cancelled && 'text-muted-foreground line-through')}>
              {dateFormat.format(from)}
            </span>
            {cancelled && <Badge variant="destructive">Cancelled</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            {timeFormat.format(from)}–{timeFormat.format(to)}
          </p>
          <p className="text-sm">
            {ROOM_LABELS[booking.room]} · {CLASS_TYPE_LABELS[booking.classType]}
          </p>
        </div>
        <ChevronDown
          aria-hidden
          className={cn('text-muted-foreground mt-1 size-4 shrink-0 transition-transform', {
            'rotate-180': open,
          })}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Price</dt>
          <dd>£{booking.totalPrice.toFixed(2)}</dd>
          <dt className="text-muted-foreground">Shared room</dt>
          <dd>{booking.shareable ? 'Yes' : 'No'}</dd>
          <dt className="text-muted-foreground">Booking reference</dt>
          <dd className="font-mono text-xs break-all">{booking.uid}</dd>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}
