import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AuthContext } from '@/lib/context/AuthContext';
import { USER_ROLES } from '@/lib/types/auth';

const mockUser = {
  userId: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: USER_ROLES.USER,
};

function mockAuthContext(isAdmin = false) {
  return {
    user: { ...mockUser, role: isAdmin ? USER_ROLES.ADMIN : USER_ROLES.USER },
    fetchUser: async () => {},
    login: async () => {},
    logout: () => {},
    register: async () => {},
    hasRole: () => isAdmin,
    isAuthenticated: true,
    isLoading: false,
    isInitialising: false,
  };
}

const meta: Meta<typeof ProfileHeader> = {
  title: 'Profile/ProfileHeader',
  component: ProfileHeader,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileHeader>;

export const User: Story = {
  render: () => (
    <AuthContext.Provider value={mockAuthContext(false)}>
      <ProfileHeader />
    </AuthContext.Provider>
  ),
};

export const Admin: Story = {
  render: () => (
    <AuthContext.Provider value={mockAuthContext(true)}>
      <ProfileHeader />
    </AuthContext.Provider>
  ),
};
