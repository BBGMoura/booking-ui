import { UserDetails } from '@/components/admin/UserDetails';

export default async function UserDetailsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return <UserDetails userUid={uid} />;
}
