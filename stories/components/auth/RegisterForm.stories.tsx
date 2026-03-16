import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within, mocked } from 'storybook/test';
import RegisterForm from '@/components/auth/RegisterForm';
import { checkInvite } from '@/lib/api/auth';

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

/** Default — step 1, clean empty form */
export const Default: Story = {};

/** Validation error — user submits with empty email */
export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(canvas.getByText('Email is required')).toBeInTheDocument();
  },
};

/** Not invited — email exists but hasn't been invited */
export const NotInvited: Story = {
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

/** Network error — backend cannot be reached */
export const NetworkError: Story = {
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

/** Step two — shown after email check passes */
export const StepTwo: Story = {
  beforeEach() {
    mocked(checkInvite).mockResolvedValue({ email: 'jane@example.com', invited: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(canvas.findByText(/step 2 coming in bms-8/i)).resolves.toBeInTheDocument();
  },
};
