import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PersonalInfoForm } from '@/components/profile/PersonalInfoForm';
import { AuthContext } from '@/lib/context/AuthContext';
import { USER_ROLES } from '@/lib/types/auth';
import { userEvent, within, expect } from 'storybook/test';

const mockUser = {
  userId: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: USER_ROLES.USER,
};

function mockAuthContext(overrides = {}) {
  return {
    user: mockUser,
    fetchUser: async () => {},
    login: async () => {},
    logout: () => {},
    register: async () => {},
    hasRole: () => false,
    isAuthenticated: true,
    isLoading: false,
    isInitialising: false,
    ...overrides,
  };
}

const meta: Meta<typeof PersonalInfoForm> = {
  title: 'Profile/PersonalInfoForm',
  component: PersonalInfoForm,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof PersonalInfoForm>;

/** Default view mode — shows user info with Edit button */
export const Default: Story = {
  render: () => (
    <AuthContext.Provider value={mockAuthContext()}>
      <PersonalInfoForm />
    </AuthContext.Provider>
  ),
};

/** Edit mode — form fields visible */
export const EditMode: Story = {
  render: () => (
    <AuthContext.Provider value={mockAuthContext()}>
      <PersonalInfoForm />
    </AuthContext.Provider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /edit/i }));
  },
};

/** Validation errors visible */
export const ValidationErrors: Story = {
  render: () => (
    <AuthContext.Provider value={mockAuthContext()}>
      <PersonalInfoForm />
    </AuthContext.Provider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /edit/i }));
    await userEvent.clear(canvas.getByLabelText('First name'));
    await userEvent.clear(canvas.getByLabelText('Phone number'));
    await userEvent.type(canvas.getByLabelText('Phone number'), 'invalid');
    await userEvent.click(canvas.getByRole('button', { name: /save changes/i }));
    await expect(canvas.findByText('First name is required')).resolves.toBeInTheDocument();
  },
};
