'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminUser } from '@/hooks/use-admin-user';
import { setUserEnabled } from '@/lib/api/user';
import { useAuth } from '@/lib/context/AuthContext';
import { USER_ROLES } from '@/lib/types/auth';
import type { UserProfile } from '@/lib/types/user';
import { parseApiError } from '@/lib/utils/errorUtils';
import {
  getUserDisplayName,
  getUserInitials,
  getUserStatus,
  type UserStatus,
} from '@/lib/utils/userStatus';
import { DisableUserDialog } from '@/components/admin/DisableUserDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const STATUS_TEXT: Record<UserStatus, string> = {
  Active: 'text-muted-foreground',
  Invited: 'text-muted-foreground',
  Disabled: 'text-destructive',
};

/** Admin › Users › one user: their details, and Disable or Enable. */
export function UserDetails({ userUid }: { userUid: string }) {
  const { user, error, notFound, reload } = useAdminUser(userUid);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/users">
          <ArrowLeft aria-hidden />
          Users
        </Link>
      </Button>

      {notFound ? (
        <p className="text-muted-foreground py-12 text-center">User not found</p>
      ) : error ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-6">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : !user ? (
        <Skeleton className="h-72 rounded-2xl" aria-busy="true" aria-label="Loading user" />
      ) : (
        <UserCard user={user} onChanged={reload} />
      )}
    </div>
  );
}

function UserCard({ user, onChanged }: { user: UserProfile; onChanged: () => void }) {
  const { user: me } = useAuth();
  const [disableOpen, setDisableOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const status = getUserStatus(user);
  const name = getUserDisplayName(user);
  const invited = status === 'Invited';
  // Disabling yourself would lock you out and cancel your own bookings. The
  // backend doesn't stop it, so the button simply isn't offered.
  const isMe = me?.uid === user.uid;

  async function enable() {
    setEnabling(true);
    try {
      await setUserEnabled(user.uid, true);
      toast.success(`${name} enabled`);
      onChanged();
    } catch (e) {
      toast.error(parseApiError(e));
    } finally {
      setEnabling(false);
    }
  }

  return (
    <section className="bg-card overflow-hidden rounded-2xl border shadow-xs">
      <div className="flex items-center gap-4 p-6">
        <Avatar className="size-16">
          <AvatarFallback className="text-foreground text-lg font-medium">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-medium">{name}</h2>
            {user.role === USER_ROLES.ADMIN && (
              <span className="text-muted-foreground shrink-0 rounded-md border px-1.5 py-px text-[11px] font-medium">
                Admin
              </span>
            )}
          </div>
          {invited && <p className="text-muted-foreground text-sm">Invite sent</p>}
        </div>
      </div>

      <dl className="space-y-4 border-t border-dashed px-6 py-5">
        <DetailRow icon={<Mail />} label="Email" value={user.email} />
        <DetailRow icon={<Phone />} label="Phone" value={user.phoneNumber || '—'} />
      </dl>

      <div className="flex items-center justify-between border-t border-dashed px-6 py-3">
        <span className={cn('text-sm', STATUS_TEXT[status])}>{status}</span>
        {status === 'Active' && !isMe && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDisableOpen(true)}
          >
            Disable
          </Button>
        )}
        {status === 'Disabled' && (
          <Button variant="outline" size="sm" onClick={enable} disabled={enabling}>
            {enabling && <Spinner />}
            Enable
          </Button>
        )}
      </div>

      <DisableUserDialog
        user={user}
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onDisabled={onChanged}
      />
    </section>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full border [&_svg]:size-4"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </dt>
        <dd className="truncate">{value}</dd>
      </div>
    </div>
  );
}
