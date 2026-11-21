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
          <DialogDescription>{disableMessage(upcoming, user.firstName || name)}</DialogDescription>
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
 * Disabling cancels the upcoming bookings, and enabling the user again doesn't
 * bring them back. With no bookings there's nothing to say about either.
 * Without a count the bookings are still mentioned, since they're cancelled either way.
 */
function disableMessage(upcoming: number | null | undefined, firstName: string): ReactNode {
  if (upcoming === undefined) return 'Checking their upcoming bookings…';
  if (upcoming === 0) return 'Disabling this account removes their access to the Booking Portal.';
  const bookings =
    upcoming === null ? (
      'upcoming bookings'
    ) : upcoming === 1 ? (
      <>
        their <strong>1</strong> upcoming booking
      </>
    ) : (
      <>
        all <strong>{upcoming}</strong> of their upcoming bookings
      </>
    );
  return (
    <>
      This also cancels {bookings}. They won&apos;t come back if you enable {firstName} again.
    </>
  );
}
