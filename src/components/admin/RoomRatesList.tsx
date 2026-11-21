'use client';

import { useState } from 'react';
import { useRoomRates } from '@/hooks/use-room-rates';
import { USER_ROLES } from '@/lib/types/auth';
import { formatPrice, type RoomRateRow } from '@/lib/utils/roomRates';
import { SetRateDialog } from '@/components/admin/SetRateDialog';
import { TurnOffRateDialog } from '@/components/admin/TurnOffRateDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
        className="mx-auto w-full max-w-5xl space-y-2"
        aria-busy="true"
        aria-label="Loading room rates"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Room rates</caption>
        <thead className="text-muted-foreground border-b text-xs">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              Booking type
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Price per hour
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Admin only
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.classType} className="border-b border-dashed">
              <th scope="row" className="py-3 pr-3 font-medium">
                {row.label}
              </th>
              <td className="px-3 py-3">
                {row.rate ? (
                  formatPrice(row.rate.pricePerHour)
                ) : (
                  <span className="text-muted-foreground">Not set: can&apos;t be booked</span>
                )}
              </td>
              <td className="px-3 py-3">
                {row.rate ? (row.rate.role === USER_ROLES.ADMIN ? 'Yes' : 'No') : '—'}
              </td>
              <td className="py-3 pl-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`${row.rate ? 'Edit' : 'Set rate for'} ${row.label}`}
                    onClick={() => start('set', row)}
                  >
                    {row.rate ? 'Edit' : 'Set rate'}
                  </Button>
                  {row.rate && (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Turn off ${row.label}`}
                      onClick={() => start('turnOff', row)}
                    >
                      Turn off
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
