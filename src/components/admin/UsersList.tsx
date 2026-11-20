'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, UserPlus } from 'lucide-react';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { USER_ROLES } from '@/lib/types/auth';
import type { UserProfile } from '@/lib/types/user';
import {
  getUserDisplayName,
  getUserInitials,
  getUserStatus,
  type UserStatus,
} from '@/lib/utils/userStatus';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_DOT: Record<UserStatus, string> = {
  Invited: 'bg-amber-500',
  Active: 'bg-emerald-500',
  Disabled: 'bg-destructive',
};

/** Admin › Users: search, status and invite. */
export function UsersList() {
  const { search, setSearch, activeSearch, data, error, loading, setPageIndex, reload } =
    useAdminUsers();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Search by name or email"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => setInviteOpen(true)}>
          <UserPlus aria-hidden />
          Invite user
        </Button>
      </div>

      <UsersContent
        data={data}
        error={error}
        loading={loading}
        activeSearch={activeSearch}
        setPageIndex={setPageIndex}
        retry={reload}
      />

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={reload} />
    </div>
  );
}

type UsersContentProps = Pick<
  ReturnType<typeof useAdminUsers>,
  'data' | 'error' | 'loading' | 'activeSearch' | 'setPageIndex'
> & { retry: () => void };

function UsersContent({
  data,
  error,
  loading,
  activeSearch,
  setPageIndex,
  retry,
}: UsersContentProps) {
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-6">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading users">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.content.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        {activeSearch ? `No users match '${activeSearch}'` : 'No users yet'}
      </p>
    );
  }

  const { number, totalPages, totalElements } = data.page;

  return (
    <div className="space-y-2">
      <h2 className="text-muted-foreground text-sm font-medium">
        {totalElements} {totalElements === 1 ? 'user' : 'users'}
      </h2>
      <ul
        aria-label="Users"
        aria-busy={loading}
        className={cn('-mx-2 transition-opacity', loading && 'opacity-60')}
      >
        {data.content.map((user) => (
          <UserRow key={user.uid} user={user} />
        ))}
      </ul>
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t border-dashed pt-4"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={loading || number <= 0}
            onClick={() => setPageIndex(number - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {number + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || number >= totalPages - 1}
            onClick={() => setPageIndex(number + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

function UserRow({ user }: { user: UserProfile }) {
  const status = getUserStatus(user);
  const name = getUserDisplayName(user);
  // An invited user's display name is their email, so it isn't repeated underneath.
  const showEmail = name !== user.email;

  return (
    <li className="hover:bg-muted/60 relative flex items-center gap-3 rounded-lg px-2 py-3 transition-colors">
      <Avatar size="lg" className="ring-border ring-1">
        <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
          {getUserInitials(user)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/users/${user.uid}`}
            className="focus-visible:after:ring-ring/50 truncate text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2"
          >
            {name}
          </Link>
          {user.role === USER_ROLES.ADMIN && (
            <span className="bg-primary/5 text-primary shrink-0 rounded-md border px-1.5 py-px text-[11px] font-medium">
              Admin
            </span>
          )}
        </div>
        {showEmail && <p className="text-muted-foreground truncate text-sm">{user.email}</p>}
      </div>

      <span className="text-muted-foreground hidden w-28 text-sm tabular-nums sm:block">
        {user.phoneNumber || '—'}
      </span>

      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm sm:w-24">
        <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} aria-hidden />
        {status}
      </span>
    </li>
  );
}
