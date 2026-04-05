import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import * as userApi from '@/lib/api/user';

jest.mock('@/lib/api/user');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUpdateCredentials = userApi.updateCredentials as jest.MockedFunction<
  typeof userApi.updateCredentials
>;

const validPassword = 'Password1!';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ChangePasswordForm', () => {
  describe('rendering', () => {
    it('renders new password and confirm password fields', () => {
      render(<ChangePasswordForm />);

      expect(screen.getByLabelText('New password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
    });

    it('renders the Update password button', () => {
      render(<ChangePasswordForm />);

      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('does not show password requirements initially', () => {
      render(<ChangePasswordForm />);

      expect(screen.queryByText('8-16 characters')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows password requirements when user starts typing', async () => {
      render(<ChangePasswordForm />);

      await userEvent.type(screen.getByLabelText('New password'), 'a');

      expect(screen.getByText('8-16 characters')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      render(<ChangePasswordForm />);

      await userEvent.type(screen.getByLabelText('New password'), validPassword);
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different1!');
      await userEvent.click(screen.getByRole('button', { name: /update password/i }));

      expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    });

    it('shows error when confirm password is empty', async () => {
      render(<ChangePasswordForm />);

      await userEvent.type(screen.getByLabelText('New password'), validPassword);
      await userEvent.click(screen.getByRole('button', { name: /update password/i }));

      expect(await screen.findByText('Please confirm your password')).toBeInTheDocument();
    });

    it('does not call updateCredentials when validation fails', async () => {
      render(<ChangePasswordForm />);

      await userEvent.click(screen.getByRole('button', { name: /update password/i }));

      expect(mockUpdateCredentials).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    async function fillAndSubmit(password = validPassword, confirm = validPassword) {
      render(<ChangePasswordForm />);
      await userEvent.type(screen.getByLabelText('New password'), password);
      await userEvent.type(screen.getByLabelText('Confirm new password'), confirm);
      await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    }

    it('calls updateCredentials with the new password', async () => {
      mockUpdateCredentials.mockResolvedValue(undefined);

      await fillAndSubmit();

      await waitFor(() => {
        expect(mockUpdateCredentials).toHaveBeenCalledWith({ password: validPassword });
      });
    });

    it('clears the form after successful submission', async () => {
      mockUpdateCredentials.mockResolvedValue(undefined);

      await fillAndSubmit();

      await waitFor(() => {
        expect(screen.getByLabelText('New password')).toHaveValue('');
        expect(screen.getByLabelText('Confirm new password')).toHaveValue('');
      });
    });

    it('shows error alert when API call fails', async () => {
      mockUpdateCredentials.mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: { error: 'Invalid password format' } },
      });

      await fillAndSubmit();

      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });

    it('does not clear form after failed submission', async () => {
      mockUpdateCredentials.mockRejectedValue(new Error('Network error'));

      await fillAndSubmit();

      await waitFor(() => {
        expect(screen.getByLabelText('New password')).toHaveValue(validPassword);
      });
    });
  });

  describe('loading state', () => {
    it('disables button while submitting', async () => {
      mockUpdateCredentials.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      render(<ChangePasswordForm />);
      await userEvent.type(screen.getByLabelText('New password'), validPassword);
      await userEvent.type(screen.getByLabelText('Confirm new password'), validPassword);

      await userEvent.click(screen.getByRole('button', { name: /update password/i }));

      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled();
      });
    });
  });
});
