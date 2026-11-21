'use client';

import { useState } from 'react';
import { useRoomRates } from '@/hooks/use-room-rates';
import { USER_ROLES } from '@/lib/types/auth';
import { formatPrice, type RoomRateRow } from '@/lib/utils/roomRates';
import { SetRateDialog } from '@/components/admin/SetRateDialog';
import { TurnOffRateDialog } from '@/components/admin/TurnOffRateDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Action = { kind: 'set' | 'turnOff'; row: RoomRateRow; id: number };

/** Admin › Room rates: the price and Admin only setting for every booking type. */
export function RoomRatesList() {
  const { rows, error, reload } = useRoomRates();
  // Kept after the dialog closes so it doesn't vanish mid-animation; `id` gives each open fresh form state.
  const [action, setAction] = useState<Action | null>(null);
  const [open, setOpen] = useState(false);

  function start(kind: Action['kind'], row: RoomRateRow) {
    setAction((prev) => ({ kind, row, id: (prev?.id ?? 0) + 1 }));
    setOpen(true);
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-6">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  if (!rows) {
    return (
      <div
        className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 pt-7 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Loading room rates"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2">
      <h2 className="text-muted-foreground text-sm font-medium">
        Price per hour to hire a room, by booking type
      </h2>
      <ul aria-label="Room rates" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <RateCard key={row.classType} row={row} onAction={start} />
        ))}
      </ul>

      {action?.kind === 'set' && (
        <SetRateDialog
          key={action.id}
          row={action.row}
          open={open}
          onOpenChange={setOpen}
          onSaved={reload}
        />
      )}
      {action?.kind === 'turnOff' && (
        <TurnOffRateDialog
          key={action.id}
          row={action.row}
          open={open}
          onOpenChange={setOpen}
          onTurnedOff={reload}
        />
      )}
    </div>
  );
}

function RateCard({
  row,
  onAction,
}: {
  row: RoomRateRow;
  onAction: (kind: Action['kind'], row: RoomRateRow) => void;
}) {
  const { rate, label } = row;
  const who = !rate
    ? "Can't be booked"
    : rate.role === USER_ROLES.ADMIN
      ? 'Admin only'
      : 'Anyone can book';

  return (
    <li
      aria-label={label}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border',
        // A booking type with no rate can't be booked, so it looks like an empty slot to fill.
        rate ? 'bg-card shadow-xs' : 'border-dashed'
      )}
    >
      <div className="flex-1 space-y-2 p-5">
        <h3 className="font-medium">{label}</h3>
        {rate ? (
          <p>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatPrice(rate.pricePerHour)}
            </span>
            <span className="text-muted-foreground text-sm"> / hour</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-3xl font-semibold tracking-tight">Not set</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-dashed px-5 py-3">
        <span
          className={cn(
            'text-sm whitespace-nowrap',
            rate ? 'text-muted-foreground' : 'text-destructive'
          )}
        >
          {who}
        </span>
        <div className="flex gap-2">
          {rate && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Turn off ${label}`}
              onClick={() => onAction('turnOff', row)}
            >
              Turn off
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            aria-label={`${rate ? 'Edit' : 'Set rate for'} ${label}`}
            onClick={() => onAction('set', row)}
          >
            {rate ? 'Edit' : 'Set rate'}
          </Button>
        </div>
      </div>
    </li>
  );
}
