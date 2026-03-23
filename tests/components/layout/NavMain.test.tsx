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
  }) => <li data-active={isActive}>{children}</li>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
}));

beforeEach(() => {
  mockPathname.mockReturnValue('/dashboard');
  jest.clearAllMocks();
});

describe('NavMain', () => {
  describe('main nav items', () => {
    it('renders Dashboard, Bookings and Booking History', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Bookings')).toBeInTheDocument();
      expect(screen.getByText('Booking History')).toBeInTheDocument();
    });

    it('renders the Main group label', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.getByText('Main')).toBeInTheDocument();
    });
  });

  describe('admin nav items', () => {
    it('renders Users, Rooms and Classes when isAdmin is true', () => {
      render(<NavMain isAdmin={true} />);

      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Rooms')).toBeInTheDocument();
      expect(screen.getByText('Classes')).toBeInTheDocument();
    });

    it('renders the Admin group label when isAdmin is true', () => {
      render(<NavMain isAdmin={true} />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('does not render admin items when isAdmin is false', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Rooms')).not.toBeInTheDocument();
      expect(screen.queryByText('Classes')).not.toBeInTheDocument();
    });

    it('does not render Admin group label when isAdmin is false', () => {
      render(<NavMain isAdmin={false} />);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('marks the current route as active', () => {
      mockPathname.mockReturnValue('/bookings');

      render(<NavMain isAdmin={false} />);

      const bookingsLink = screen.getByRole('link', { name: /bookings/i });
      expect(bookingsLink.closest('[data-active]')).toHaveAttribute('data-active', 'true');
    });

    it('does not mark other routes as active', () => {
      mockPathname.mockReturnValue('/bookings');

      render(<NavMain isAdmin={false} />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink.closest('[data-active]')).toHaveAttribute('data-active', 'false');
    });
  });
});
