'use client';

import { useEffect, useState } from 'react';
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

interface DisableUserDialogProps {
  user: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisabled: () => void;
}

/**
 * Confirms disabling a user. The backend cancels all of their bookings when
 * they're disabled, and enabling them again doesn't bring the bookings back,
 * so the admin is told how many upcoming bookings will go.
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
  const firstName = user.firstName || name;

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    // Starting a fresh count each time the dialog opens is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable {name}?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>They won&apos;t be able to sign in until you enable them again.</p>
              <BookingsWarning upcoming={upcoming} firstName={firstName} />
            </div>
          </DialogDescription>
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

function BookingsWarning({
  upcoming,
  firstName,
}: {
  upcoming: number | null | undefined;
  firstName: string;
}) {
  if (upcoming === undefined) return <p>Checking their upcoming bookings…</p>;
  // Without a count, still warn: the bookings are cancelled either way.
  if (upcoming === null) {
    return (
      <p>
        This also cancels all of their upcoming bookings. They won&apos;t come back if you enable{' '}
        {firstName} again.
      </p>
    );
  }
  if (upcoming === 0) return null;
  const comeBack = `come back if you enable ${firstName} again.`;
  if (upcoming === 1) {
    return (
      <p>
        {'This also cancels their '}
        <strong className="text-foreground">1</strong>
        {` upcoming booking. It won't ${comeBack}`}
      </p>
    );
  }
  return (
    <p>
      {'This also cancels all '}
      <strong className="text-foreground">{upcoming}</strong>
      {` of their upcoming bookings. They won't ${comeBack}`}
    </p>
  );
}
