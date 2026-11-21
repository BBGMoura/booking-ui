import { UserDetails } from '@/components/admin/UserDetails';

export default async function UserDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { uid } = await params;
  const { from } = await searchParams;
  // `from` is the users list's query string, so "← Users" goes back to the same search and page.
  const backHref = from ? `/admin/users?${new URLSearchParams(from).toString()}` : '/admin/users';
  // Keyed so a different user starts fresh rather than showing the last one while loading.
  return <UserDetails key={uid} userUid={uid} backHref={backHref} />;
}
