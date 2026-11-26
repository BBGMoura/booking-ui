import { render, screen } from '@testing-library/react';
import { NavMain } from '@/components/layout/NavMain';
import React from 'react';

const mockPathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

jest.mock('@/components/ui/sidebar', () => ({
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuButton: ({
    children,
    isActive,
    asChild,
  }: {
    children: React.ReactNode;
    isActive?: boolean;
    asChild?: boolean;
  }) => <div data-active={isActive}>{children}</div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
}));

beforeEach(() => {
  mockPathname.mockReturnValue('/dashboard');
  jest.clearAllMocks();
});

describe('NavMain', () => {
  describe('main nav items', () => {
    it('renders Dashboard, Room Calendar and My Bookings', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Room Calendar')).toBeInTheDocument();
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });

    it('renders the Main group label', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.getByText('Main')).toBeInTheDocument();
    });
  });

  describe('admin nav items', () => {
    it('renders Users, Room Rates and Settings when isAdmin is true', () => {
      render(<NavMain isAdmin={true} />);

      expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
        'href',
        '/admin/settings'
      );
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Room Rates')).toBeInTheDocument();
    });

    it('renders the Manage group label when isAdmin is true', () => {
      render(<NavMain isAdmin={true} />);

      expect(screen.getByText('Manage')).toBeInTheDocument();
    });

    it('does not render admin items when isAdmin is false', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Rooms')).not.toBeInTheDocument();
      expect(screen.queryByText('Room Rates')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('does not render the Manage group label when isAdmin is false', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.queryByText('Manage')).not.toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('marks the current route as active', () => {
      mockPathname.mockReturnValue('/calendar');

      render(<NavMain isAdmin={false} />);

      const calendarLink = screen.getByRole('link', { name: /room calendar/i });
      expect(calendarLink.closest('[data-active]')).toHaveAttribute('data-active', 'true');
    });

    it('does not mark other routes as active', () => {
      mockPathname.mockReturnValue('/calendar');

      render(<NavMain isAdmin={false} />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink.closest('[data-active]')).toHaveAttribute('data-active', 'false');
    });
  });
});
