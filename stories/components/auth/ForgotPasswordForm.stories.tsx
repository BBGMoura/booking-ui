import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta: Meta<typeof ForgotPasswordForm> = {
  title: 'Auth/ForgotPasswordForm',
  component: ForgotPasswordForm,
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
type Story = StoryObj<typeof ForgotPasswordForm>;

/** Default empty state — what a user sees when they first land on the page */
export const Default: Story = {
  args: {
    onResetPassword: fn().mockResolvedValue(undefined),
  },
};

/** Loading state — shown while the API call is in flight */
export const Loading: Story = {
  args: {
    onResetPassword: () => new Promise(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset email' }));
  },
};

/** Success state — shown after a successful API response */
export const Success: Story = {
  args: {
    onResetPassword: async () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset email' }));

    await expect(canvas.findByText('Check your inbox')).resolves.toBeInTheDocument();
  },
};

/** Server error — shown when the API returns an error */
export const ServerError: Story = {
  args: {
    onResetPassword: async () => {
      throw {
        isAxiosError: true,
        response: { status: 404, data: { error: 'No account found for that email.' } },
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset email' }));

    await expect(canvas.findByRole('alert')).resolves.toBeInTheDocument();
  },
};

/** Network error — shown when the backend cannot be reached */
export const NetworkError: Story = {
  args: {
    onResetPassword: async () => {
      throw { isAxiosError: true, response: undefined };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset email' }));

    await expect(canvas.findByRole('alert')).resolves.toBeInTheDocument();
  },
};

/** Validation error — shown when user submits with empty or invalid email */
export const ValidationError: Story = {
  args: {
    onResetPassword: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Send reset email' }));

    await expect(canvas.findByText('Email is required')).resolves.toBeInTheDocument();
  },
};
