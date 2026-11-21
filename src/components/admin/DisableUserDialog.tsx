'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { getUserBookings } from '@/lib/api/booking';
import { setUserEnabled } from '@/lib/api/user';
import type { UserProfile } from '@/lib/types/user';
import { parseApiError } from '@/lib/utils/errorUtils';
import { getUserDisplayName } from '@/lib/utils/userStatus';
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

interface DisableUserDialogProps {
  user: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisabled: () => void;
}

/**
 * Confirms disabling a user. The backend cancels all of their bookings when
 * they're disabled, so the admin is told how many upcoming bookings will go.
 */
export function DisableUserDialog({
  user,
  open,
  onOpenChange,
  onDisabled,
}: DisableUserDialogProps) {
  // undefined while counting; null if the count couldn't be loaded.
  const [upcoming, setUpcoming] = useState<number | null | undefined>(undefined);
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = getUserDisplayName(user);

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    setUpcoming(undefined);
    setError(null);
    getUserBookings(user.uid, {
      dateFrom: new Date().toISOString(),
      status: 'BOOKED',
      size: 1,
    })
      .then((page) => !ignore && setUpcoming(page.page.totalElements))
      .catch(() => !ignore && setUpcoming(null));
    return () => {
      ignore = true;
    };
  }, [open, user.uid]);

  function handleOpenChange(next: boolean) {
    if (disabling) return;
    onOpenChange(next);
  }

  async function disable() {
    setDisabling(true);
    setError(null);
    try {
      await setUserEnabled(user.uid, false);
      toast.success(`${name} disabled`);
      onOpenChange(false);
      onDisabled();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setDisabling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_FULL_WIDTH_ON_PHONE}>
        <DialogHeader className="gap-3">
          <DialogTitle>Disable {name}?</DialogTitle>
          <DialogDescription>{disableMessage(upcoming)}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={disabling}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={disable}
            disabled={disabling || upcoming === undefined}
          >
            {disabling ? (
              <>
                <Spinner />
                Disabling...
              </>
            ) : (
              'Disable'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One sentence: they lose access, and their upcoming bookings are cancelled.
 * Without a count the bookings are still mentioned, since they're cancelled either way.
 */
function disableMessage(upcoming: number | null | undefined): ReactNode {
  if (upcoming === undefined) return 'Checking their upcoming bookings…';
  const access = 'Disabling this account removes their access to the Booking Portal';
  if (upcoming === 0) return `${access}.`;
  if (upcoming === 1) return `${access} and cancels their upcoming booking.`;
  if (upcoming === null) return `${access} and cancels any upcoming bookings.`;
  return (
    <>
      {access} and cancels their <strong>{upcoming}</strong> upcoming bookings.
    </>
  );
}
