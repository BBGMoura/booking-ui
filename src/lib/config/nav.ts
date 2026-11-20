import { CalendarDays, LayoutDashboard, CalendarCheck, Users, Music } from 'lucide-react';
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
  { title: 'Classes', url: '/admin/classes', icon: Music },
];

// Derived from nav items — AppHeader uses this instead of a separate hardcoded map.
// Adding a new route only requires updating mainNavItems or adminNavItems above.
export const pageTitles: Record<string, string> = Object.fromEntries([
  ...mainNavItems.map((item) => [item.url, item.title]),
  ...adminNavItems.map((item) => [item.url, item.title]),
  ['/profile', 'Profile'],
]);
