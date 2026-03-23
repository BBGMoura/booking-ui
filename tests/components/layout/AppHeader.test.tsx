import { render, screen } from '@testing-library/react';
import { AppHeader } from '@/components/layout/AppHeader';
import { mainNavItems, adminNavItems } from '@/lib/config/nav';

const mockPathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

jest.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: () => <button>Toggle sidebar</button>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <button>Toggle theme</button>,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AppHeader', () => {
  describe('page title', () => {
    it.each(mainNavItems)('shows "$title" when pathname is "$url"', ({ url, title }) => {
      mockPathname.mockReturnValue(url);

      render(<AppHeader />);

      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it.each(adminNavItems)('shows "$title" when pathname is "$url"', ({ url, title }) => {
      mockPathname.mockReturnValue(url);

      render(<AppHeader />);

      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('shows "Profile" when pathname is /profile', () => {
      mockPathname.mockReturnValue('/profile');

      render(<AppHeader />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('falls back to "Booking Portal" for unknown pathnames', () => {
      mockPathname.mockReturnValue('/some/unknown/route');

      render(<AppHeader />);

      expect(screen.getByText('Booking Portal')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      mockPathname.mockReturnValue('/dashboard');
    });

    it('renders the sidebar trigger', () => {
      render(<AppHeader />);

      expect(screen.getByText('Toggle sidebar')).toBeInTheDocument();
    });

    it('renders the theme toggle', () => {
      render(<AppHeader />);

      expect(screen.getByText('Toggle theme')).toBeInTheDocument();
    });
  });
});
