import { CalendarDays, LayoutDashboard, CalendarCheck, Users, Tags, Settings } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const mainNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Room Calendar', url: '/calendar', icon: CalendarDays },
  { title: 'My Bookings', url: '/my-bookings', icon: CalendarCheck },
];

export const adminNavItems: NavItem[] = [
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Room Rates', url: '/admin/rates', icon: Tags },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

// Derived from nav items — AppHeader uses this instead of a separate hardcoded map.
// Adding a new route only requires updating mainNavItems or adminNavItems above.
export const pageTitles: Record<string, string> = Object.fromEntries([
  ...mainNavItems.map((item) => [item.url, item.title]),
  ...adminNavItems.map((item) => [item.url, item.title]),
  ['/profile', 'Profile'],
]);

/** True on the item's own page and on pages under it, e.g. one user under Users. */
export function isNavItemActive(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`);
}

/** The header title: the page's own, or else the section it sits under. */
export function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const section = Object.keys(pageTitles).find((url) => isNavItemActive(pathname, url));
  return section ? pageTitles[section] : 'Booking Portal';
}
