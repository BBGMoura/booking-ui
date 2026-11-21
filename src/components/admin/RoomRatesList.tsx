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

/** Admin › Room Rates: the price and Admin only setting for every booking type. */
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
      <ul
        aria-label="Room Rates"
        className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs"
      >
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
        'flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4',
        !rate && 'bg-muted/40'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className={cn('text-sm', rate ? 'text-muted-foreground' : 'text-destructive')}>{who}</p>
      </div>
      <p className="text-right sm:w-36">
        {rate ? (
          <>
            <span className="text-xl font-semibold tracking-tight tabular-nums">
              {formatPrice(rate.pricePerHour)}
            </span>
            <span className="text-muted-foreground text-sm"> / hour</span>
          </>
        ) : (
          <span className="text-muted-foreground text-xl font-semibold tracking-tight">
            Not set
          </span>
        )}
      </p>
      <div className="flex w-full justify-end gap-2 sm:w-44">
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
    </li>
  );
}
