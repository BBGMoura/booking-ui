import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AuthContext } from '@/lib/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { expect, userEvent, within } from 'storybook/test';

function mockAuthContext(
  overrides: {
    login?: () => Promise<void>;
    isLoading?: boolean;
  } = {}
) {
  return {
    login: overrides.login ?? (() => Promise.resolve()),
    logout: () => {},
    register: () => Promise.resolve(),
    hasRole: () => false,
    user: null,
    isAuthenticated: false,
    isLoading: overrides.isLoading ?? false,
    isInitialising: false,
  };
}

const meta: Meta<typeof LoginForm> = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Story />
      </main>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

/** Default empty state — what a user sees when they first land on the login page */
export const Default: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthContext()}>
        <Story />
      </AuthContext.Provider>
    ),
  ],
};

/** Loading state — shown while the login API call is in flight */
export const Loading: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthContext({ isLoading: true })}>
        <Story />
      </AuthContext.Provider>
    ),
  ],
};

/** Server error — shown after wrong credentials */
export const ServerError: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={mockAuthContext({
          login: async () => {
            throw {
              isAxiosError: true,
              response: { status: 403, data: { error: 'Invalid username or password.' } },
            };
          },
        })}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'Password1!');
    await userEvent.click(canvas.getByRole('button', { name: 'Login' }));

    await expect(canvas.findByRole('alert')).resolves.toBeInTheDocument();
  },
};

/** Network error — shown when the backend cannot be reached */
export const NetworkError: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={mockAuthContext({
          login: async () => {
            throw { isAxiosError: true, response: undefined };
          },
        })}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'Password1!');
    await userEvent.click(canvas.getByRole('button', { name: 'Login' }));

    await expect(canvas.findByRole('alert')).resolves.toBeInTheDocument();
  },
};

/** Validation errors — shown when user submits with empty or invalid fields */
export const ValidationErrors: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthContext()}>
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Login' }));

    await expect(canvas.getByText('Email is required')).toBeInTheDocument();
    await expect(canvas.getByText('Password is required')).toBeInTheDocument();
  },
};
