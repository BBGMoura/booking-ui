'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { USER_ROLES } from '@/lib/types/auth';
import { getUserDisplayName, getUserStatus, type UserStatus } from '@/lib/utils/userStatus';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_VARIANT: Record<UserStatus, 'secondary' | 'outline' | 'destructive'> = {
  Invited: 'outline',
  Active: 'secondary',
  Disabled: 'destructive',
};

/** Admin › Users: search, status and invite. */
export function UsersList() {
  const { search, setSearch, activeSearch, data, error, loading, setPageIndex, reload } =
    useAdminUsers();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Search users"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setInviteOpen(true)}>Invite user</Button>
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
      <div className="space-y-2" aria-busy="true" aria-label="Loading users">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.content.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        {activeSearch ? `No users match '${activeSearch}'` : 'No users yet'}
      </p>
    );
  }

  const { number, totalPages } = data.page;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm" aria-busy={loading}>
          <thead className="bg-muted/50 text-left">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Phone
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-60' : undefined}>
            {data.content.map((user) => {
              const status = getUserStatus(user);
              return (
                <tr key={user.uid} className="hover:bg-muted/50 relative border-t">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/users/${user.uid}`}
                      className="font-medium after:absolute after:inset-0 hover:underline"
                    >
                      {getUserDisplayName(user)}
                    </Link>
                    {user.role === USER_ROLES.ADMIN && (
                      <Badge className="ml-2" variant="default">
                        Admin
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.phoneNumber || '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <Button
            variant="outline"
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
