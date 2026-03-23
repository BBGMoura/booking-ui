import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AuthContext } from '@/lib/context/AuthContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { USER_ROLES } from '@/lib/types/auth';

const mockUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  userId: 1,
  phoneNumber: '07700000000',
  enabled: true,
  role: USER_ROLES.USER,
};

function mockAuthContext(isAdmin = false) {
  return {
    user: mockUser,
    login: () => Promise.resolve(),
    logout: () => {},
    register: () => Promise.resolve(),
    hasRole: (_role: string) => isAdmin,
    isAuthenticated: true,
    isLoading: false,
    isInitialising: false,
  };
}

function SidebarWrapper({
  isAdmin = false,
  defaultOpen = true,
}: {
  isAdmin?: boolean;
  defaultOpen?: boolean;
}) {
  return (
    <AuthContext.Provider value={mockAuthContext(isAdmin)}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <div className="text-muted-foreground p-6 text-sm">Page content area</div>
        </SidebarInset>
      </SidebarProvider>
    </AuthContext.Provider>
  );
}

const meta: Meta<typeof AppSidebar> = {
  title: 'Layout/AppSidebar',
  component: AppSidebar,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/dashboard' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AppSidebar>;

/** Standard user — no admin section visible */
export const Default: Story = {
  render: () => <SidebarWrapper />,
};

/** Admin user — Admin section with Users, Rooms and Classes visible */
export const Admin: Story = {
  render: () => <SidebarWrapper isAdmin />,
};

/** Active route on Bookings */
export const ActiveBookings: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/bookings' },
    },
  },
  render: () => <SidebarWrapper />,
};

/** Collapsed to icon-only mode */
export const Collapsed: Story = {
  render: () => <SidebarWrapper defaultOpen={false} />,
};
