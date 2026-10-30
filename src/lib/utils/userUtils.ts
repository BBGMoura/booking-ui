import { type User } from '@/lib/types/auth';

export function getInitials(user: User | null): string {
  if (!user) return '??';
  const first = user.firstName?.[0] ?? '?';
  const last = user.lastName?.[0] ?? '?';
  return `${first}${last}`.toUpperCase();
}
