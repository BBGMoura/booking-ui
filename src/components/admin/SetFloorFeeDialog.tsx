'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { setDanceClass } from '@/lib/api/danceClass';
import { USER_ROLES } from '@/lib/types/auth';
import { parseApiError } from '@/lib/utils/errorUtils';
import {
  buildDanceClassRequest,
  nextPriceInput,
  validatePrice,
  type FloorFeeRow,
} from '@/lib/utils/floorFees';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { DIALOG_FULL_WIDTH_ON_PHONE } from '@/lib/utils/dialog';

interface SetFloorFeeDialogProps {
  row: FloorFeeRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Sets the floor fee for one booking type. The parent mounts it fresh for each row. */
export function SetFloorFeeDialog({ row, open, onOpenChange, onSaved }: SetFloorFeeDialogProps) {
  const [price, setPrice] = useState(row.fee ? row.fee.pricePerHour.toFixed(2) : '');
  const [adminOnly, setAdminOnly] = useState(row.fee?.role === USER_ROLES.ADMIN);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    onOpenChange(next);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = validatePrice(price);
    setPriceError(invalid);
    if (invalid) return;
    setSubmitting(true);
    setError(null);
    try {
      await setDanceClass(buildDanceClassRequest(row.classType, price, adminOnly));
      toast.success(`${row.label} floor fee saved`);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_FULL_WIDTH_ON_PHONE}>
        <DialogHeader>
          <DialogTitle>
            {row.fee ? 'Edit' : 'Set'} {row.label} floor fee
          </DialogTitle>
          <DialogDescription>
            New bookings use the new floor fee. Existing bookings keep the price they were booked
            at.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Field data-invalid={!!priceError}>
            <FieldLabel htmlFor="rate-price">Price per hour</FieldLabel>
            <Input
              id="rate-price"
              inputMode="decimal"
              placeholder="20.00"
              autoComplete="off"
              value={price}
              onChange={(e) => {
                const next = nextPriceInput(price, e.target.value);
                setPrice(next);
                if (priceError) setPriceError(validatePrice(next));
              }}
              disabled={submitting}
              aria-invalid={!!priceError}
            />
            {priceError && <FieldError errors={[{ message: priceError }]} />}
          </Field>

          <FieldLabel htmlFor="rate-admin-only" className="border-dashed">
            <Field className="gap-1">
              <div className="flex items-center justify-between gap-3">
                <FieldTitle id="rate-admin-only-label">Admin only</FieldTitle>
                <Switch
                  id="rate-admin-only"
                  aria-labelledby="rate-admin-only-label"
                  checked={adminOnly}
                  onCheckedChange={setAdminOnly}
                  disabled={submitting}
                />
              </div>
              <FieldDescription>Only admins can book this booking type.</FieldDescription>
            </Field>
          </FieldLabel>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                'Save floor fee'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
