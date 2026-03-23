import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/lib/context/AuthContext';
import { NavUser } from '@/components/layout/NavUser';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/context/AuthContext');

jest.mock('@/components/ui/sidebar', () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

const mockUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
};

function mockUseAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as jest.Mock).mockReturnValue({
    user: mockUser,
    logout: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  mockUseAuth();
  jest.clearAllMocks();
});

describe('NavUser', () => {
  describe('rendering', () => {
    it('renders the user full name', () => {
      render(<NavUser />);

      expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    });

    it('renders the user email', () => {
      render(<NavUser />);

      expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    });

    it('renders initials derived from first and last name', () => {
      render(<NavUser />);

      expect(screen.getAllByText('JD').length).toBeGreaterThan(0);
    });

    it('renders ?? initials when user is null', () => {
      mockUseAuth({ user: null });

      render(<NavUser />);

      expect(screen.getAllByText('??').length).toBeGreaterThan(0);
    });
  });

  describe('dropdown', () => {
    it('shows Profile and Log out options when opened', async () => {
      render(<NavUser />);

      await userEvent.click(screen.getByRole('button'));

      expect(await screen.findByText('Profile')).toBeInTheDocument();
      expect(await screen.findByText('Log out')).toBeInTheDocument();
    });

    it('Profile link points to /profile', async () => {
      render(<NavUser />);

      await userEvent.click(screen.getByRole('button'));
      const profileItem = await screen.findByText('Profile');

      expect(profileItem.closest('a')).toHaveAttribute('href', '/profile');
    });
  });

  describe('logout', () => {
    it('calls logout() when Log out is clicked', async () => {
      const mockLogout = jest.fn();
      mockUseAuth({ logout: mockLogout });

      render(<NavUser />);

      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(await screen.findByText('Log out'));

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('redirects to /login after logout', async () => {
      render(<NavUser />);

      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(await screen.findByText('Log out'));

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
