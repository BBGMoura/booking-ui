import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within, mocked } from 'storybook/test';
import RegisterForm from '@/components/auth/RegisterForm';
import { checkInvite } from '@/lib/api/auth';
import { AuthContext } from '@/lib/context/AuthContext';

const meta: Meta<typeof RegisterForm> = {
  title: 'Auth/RegisterForm',
  component: RegisterForm,
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
type Story = StoryObj<typeof RegisterForm>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Advances the form to step 2 by simulating a successful invite check.
 * Reusable across step 2 stories.
 */
async function advanceToStepTwo(canvas: ReturnType<typeof within>) {
  mocked(checkInvite).mockResolvedValue({ email: 'jane@example.com', invited: true });
  await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
  await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
  await expect(
    canvas.findByRole('button', { name: 'Create account' })
  ).resolves.toBeInTheDocument();
}

// ─── Step 1 Stories ───────────────────────────────────────────────────────────

/** Step 1 default — clean empty form, user just landed on register page */
export const Default: Story = {};

/** Step 1 validation error — user clicks continue with no email entered */
export const StepOneValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));

    await expect(canvas.findByText('Email is required')).resolves.toBeInTheDocument();
  },
};

/** Step 1 invalid email — user enters a badly formatted email */
export const StepOneInvalidEmail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'notanemail');
    await userEvent.tab();

    await expect(
      canvas.findByText('Please enter a valid email address')
    ).resolves.toBeInTheDocument();
  },
};

/** Step 1 not invited — email is valid but not in the system */
export const StepOneNotInvited: Story = {
  beforeEach() {
    mocked(checkInvite).mockResolvedValue({ email: 'unknown@example.com', invited: false });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'unknown@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));

    await expect(
      canvas.findByText('This email has not been invited. Please contact an administrator.')
    ).resolves.toBeInTheDocument();
  },
};

/** Step 1 network error — backend cannot be reached */
export const StepOneNetworkError: Story = {
  beforeEach() {
    mocked(checkInvite).mockRejectedValue(new Error('Network error'));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));

    await expect(canvas.findByRole('alert')).resolves.toBeInTheDocument();
  },
};

/** Step 1 loading — spinner shown while invite check is in flight */
export const StepOneLoading: Story = {
  beforeEach() {
    mocked(checkInvite).mockImplementation(() => new Promise(() => {}));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));

    await expect(canvas.findByText('Checking...')).resolves.toBeInTheDocument();
  },
};

// ─── Step 2 Stories ───────────────────────────────────────────────────────────

/** Step 2 default — clean details form with email pre-filled from step 1 */
export const StepTwoDefault: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          register: async () => {},
          login: async () => {},
          logout: () => {},
          hasRole: () => false,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialising: false,
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToStepTwo(canvas);
  },
};

/** Step 2 validation errors — user submits with empty fields */
export const StepTwoValidationErrors: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          register: async () => {},
          login: async () => {},
          logout: () => {},
          hasRole: () => false,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialising: false,
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToStepTwo(canvas);

    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));

    await expect(canvas.findByText('First name is required')).resolves.toBeInTheDocument();
    await expect(canvas.findByText('Last name is required')).resolves.toBeInTheDocument();
    await expect(canvas.findByText('Phone number is required')).resolves.toBeInTheDocument();
  },
};

/** Step 2 passwords don't match */
export const StepTwoPasswordMismatch: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          register: async () => {},
          login: async () => {},
          logout: () => {},
          hasRole: () => false,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialising: false,
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToStepTwo(canvas);

    await userEvent.type(canvas.getByLabelText('Password'), 'Password1!');
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'DifferentPassword1!');
    await userEvent.tab();

    await expect(canvas.findByText('Passwords do not match')).resolves.toBeInTheDocument();
  },
};

/** Step 2 loading — spinner shown while registration is in flight */
export const StepTwoLoading: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          register: async () => {},
          login: async () => {},
          logout: () => {},
          hasRole: () => false,
          user: null,
          isAuthenticated: false,
          isLoading: true,
          isInitialising: false,
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    mocked(checkInvite).mockResolvedValue({ email: 'jane@example.com', invited: true });
    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(
      canvas.findByRole('button', { name: /Creating account/ })
    ).resolves.toBeInTheDocument();
  },
};

/** Step 2 server error — registration failed */
export const StepTwoServerError: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          register: async () => {
            throw new Error('Registration failed');
          },
          login: async () => {},
          logout: () => {},
          hasRole: () => false,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialising: false,
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToStepTwo(canvas);

    await userEvent.type(canvas.getByLabelText('First name'), 'Jane');
    await userEvent.type(canvas.getByLabelText('Last name'), 'Doe');
    await userEvent.type(canvas.getByLabelText('Phone number'), '07112233445');
    await userEvent.type(canvas.getByLabelText('Password'), 'Password1!');
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'Password1!');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));

    await expect(canvas.findByRole('alert')).resolves.toBeInTheDocument();
  },
};
