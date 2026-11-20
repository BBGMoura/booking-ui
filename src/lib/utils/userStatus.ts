import type { UserProfile } from '@/lib/types/user';

export type UserStatus = 'Invited' | 'Active' | 'Disabled';

/**
 * Invited: not registered yet (no first or last name).
 * Active: registered and enabled. Disabled: registered but not enabled.
 */
export function getUserStatus(
  user: Pick<UserProfile, 'firstName' | 'lastName' | 'enabled'>
): UserStatus {
  if (!user.firstName && !user.lastName) return 'Invited';
  return user.enabled ? 'Active' : 'Disabled';
}

/** The name to list: first and last name, or the email for someone who hasn't registered. */
export function getUserDisplayName(
  user: Pick<UserProfile, 'firstName' | 'lastName' | 'email'>
): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email || '—';
}
