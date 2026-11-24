'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deactivateDanceClass } from '@/lib/api/danceClass';
import { parseApiError } from '@/lib/utils/errorUtils';
import type { FloorFeeRow } from '@/lib/utils/floorFees';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { DIALOG_FULL_WIDTH_ON_PHONE } from '@/lib/utils/dialog';

interface TurnOffFloorFeeDialogProps {
  row: FloorFeeRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTurnedOff: () => void;
}

/** Confirms turning off a floor fee, which stops the booking type being booked. */
export function TurnOffFloorFeeDialog({
  row,
  open,
  onOpenChange,
  onTurnedOff,
}: TurnOffFloorFeeDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function turnOff() {
    setSubmitting(true);
    setError(null);
    try {
      await deactivateDanceClass(row.classType);
      toast.success(`${row.label} floor fee turned off`);
      onOpenChange(false);
      onTurnedOff();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_FULL_WIDTH_ON_PHONE}>
        <DialogHeader className="gap-3">
          <DialogTitle>Turn off the {row.label} floor fee?</DialogTitle>
          <DialogDescription>
            {`No one will be able to book ${row.label} until you set a new floor fee. Existing bookings aren't affected.`}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={turnOff} disabled={submitting}>
            {submitting ? (
              <>
                <Spinner />
                Turning off...
              </>
            ) : (
              'Turn off'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
