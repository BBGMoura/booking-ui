import { type User } from '@/lib/types/auth';

export function getInitials(user: User | null): string {
  if (!user) return '??';
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
}
