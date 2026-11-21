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

const TAG = 'shrink-0 rounded-md border px-1.5 py-px text-[11px] font-medium';

// Plain text rather than a badge, so View is the only thing on the card that
// looks clickable. Only Disabled is coloured: it's the one an admin needs to notice.
const STATUS_TEXT: Record<UserStatus, string> = {
  Active: 'text-muted-foreground',
  Invited: 'text-muted-foreground',
  Disabled: 'text-destructive',
};

/** Admin › Users: search, status and invite. */
export function UsersList() {
  const { listQuery, search, setSearch, activeSearch, data, error, loading, setPageIndex, reload } =
    useAdminUsers();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
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
          <span className="sr-only sm:not-sr-only">Invite user</span>
        </Button>
      </div>

      <UsersContent
        data={data}
        error={error}
        loading={loading}
        activeSearch={activeSearch}
        setPageIndex={setPageIndex}
        listQuery={listQuery}
        retry={reload}
      />

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={reload} />
    </div>
  );
}

type UsersContentProps = Pick<
  ReturnType<typeof useAdminUsers>,
  'data' | 'error' | 'loading' | 'activeSearch' | 'setPageIndex' | 'listQuery'
> & { retry: () => void };

function UsersContent({
  data,
  error,
  loading,
  activeSearch,
  setPageIndex,
  listQuery,
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
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Loading users"
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
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
        className={cn(
          'grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3',
          loading && 'opacity-60'
        )}
      >
        {data.content.map((user) => (
          <UserCard key={user.uid} user={user} listQuery={listQuery} />
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

function UserCard({ user, listQuery }: { user: UserProfile; listQuery: string }) {
  const status = getUserStatus(user);
  const name = getUserDisplayName(user);
  // An invited user has no name yet, so their email stands in for it.
  const invited = name === user.email;

  return (
    <li className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-xs">
      <div className="flex flex-1 items-center gap-3 p-4 sm:flex-col sm:gap-4 sm:p-6 sm:text-center">
        <Avatar className="size-11 sm:size-16">
          <AvatarFallback className="text-foreground font-medium sm:text-lg">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>

        <div className="w-full min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 sm:justify-center">
            <p className="truncate font-medium">{name}</p>
            {user.role === USER_ROLES.ADMIN && (
              <span className={cn(TAG, 'text-muted-foreground')}>Admin</span>
            )}
          </div>
          <p className="text-muted-foreground truncate text-sm">
            {invited ? 'Invite sent' : user.email}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-dashed px-4 py-3 sm:px-5">
        <span className={cn('text-sm', STATUS_TEXT[status])}>{status}</span>
        <Button asChild variant="outline" size="sm">
          <Link
            // Carries the list's search and page, so "← Users" can return to them.
            href={`/admin/users/${user.uid}${listQuery ? `?from=${encodeURIComponent(listQuery)}` : ''}`}
            aria-label={`View ${name}`}
          >
            View
          </Link>
        </Button>
      </div>
    </li>
  );
}
