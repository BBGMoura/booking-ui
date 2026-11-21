import { Suspense } from 'react';
import { UsersList } from '@/components/admin/UsersList';

export default function UsersPage() {
  // UsersList reads its search and page from the URL, which needs a Suspense boundary.
  return (
    <Suspense>
      <UsersList />
    </Suspense>
  );
}
