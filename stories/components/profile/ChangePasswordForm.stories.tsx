import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { userEvent, within, expect } from 'storybook/test';

const meta: Meta<typeof ChangePasswordForm> = {
  title: 'Profile/ChangePasswordForm',
  component: ChangePasswordForm,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof ChangePasswordForm>;

/** Default empty state */
export const Default: Story = {};

/** Password requirements showing as user types */
export const WithRequirements: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), 'Password1');
  },
};

/** All requirements met */
export const AllRequirementsMet: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), 'Password1!');
  },
};

/** Passwords don't match error */
export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), 'Password1!');
    await userEvent.type(canvas.getByLabelText('Confirm new password'), 'Different1!');
    await userEvent.click(canvas.getByRole('button', { name: /update password/i }));
    await expect(canvas.findByText("Passwords don't match")).resolves.toBeInTheDocument();
  },
};
