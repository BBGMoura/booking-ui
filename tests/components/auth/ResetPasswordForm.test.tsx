import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const validToken = 'valid-reset-token';
const validPassword = 'Password1!';

function renderForm(token: string | null = validToken, onConfirmPasswordReset = jest.fn()) {
  return {
    onConfirmPasswordReset,
    ...render(<ResetPasswordForm token={token} onConfirmPasswordReset={onConfirmPasswordReset} />),
  };
}

async function fillAndSubmit(password = validPassword, confirmPassword = validPassword) {
  await userEvent.type(screen.getByLabelText('New password'), password);
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirmPassword);
  await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));
}

describe('ResetPasswordForm', () => {
  describe('missing token', () => {
    it('shows an invalid link state instead of the form', () => {
      renderForm(null);

      expect(screen.getByText('Invalid reset link')).toBeInTheDocument();
      expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    });

    it('shows a link to request a new reset email', () => {
      renderForm(null);

      expect(screen.getByRole('link', { name: 'Request new link' })).toHaveAttribute(
        'href',
        '/forgot-password'
      );
    });
  });

  describe('rendering', () => {
    it('renders password fields and submit button', () => {
      renderForm();

      expect(screen.getByLabelText('New password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();
    });

    it('renders a back to sign in link', () => {
      renderForm();

      expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
        'href',
        '/login'
      );
    });

    it('does not show error alert on initial render', () => {
      renderForm();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not show success state on initial render', () => {
      renderForm();

      expect(screen.queryByText('Password updated')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows required errors when submitting empty form', async () => {
      renderForm();

      await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

      expect(await screen.findByText('Password is required')).toBeInTheDocument();
      expect(await screen.findByText('Please confirm your password')).toBeInTheDocument();
    });

    it('marks unmet complexity requirements in the checklist as the user types', async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText('New password'), 'weak');

      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
    });

    it('shows password required error when password is empty and field is touched', async () => {
      renderForm();

      await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

      expect(await screen.findByText('Password is required')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText('New password'), validPassword);
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different1!');
      await userEvent.tab();

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });

    it('does not call onConfirmPasswordReset when validation fails', async () => {
      const { onConfirmPasswordReset } = renderForm();

      await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

      expect(onConfirmPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('password requirements checklist', () => {
    it('does not show checklist when password is empty', () => {
      renderForm();

      expect(screen.queryByText('8-16 characters')).not.toBeInTheDocument();
    });

    it('shows checklist when user starts typing', async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText('New password'), 'a');

      expect(screen.getByText('8-16 characters')).toBeInTheDocument();
    });
  });

  describe('submission', () => {
    it('calls onConfirmPasswordReset with the token and new password', async () => {
      const onConfirmPasswordReset = jest.fn().mockResolvedValue(undefined);
      renderForm(validToken, onConfirmPasswordReset);

      await fillAndSubmit();

      await waitFor(() => {
        expect(onConfirmPasswordReset).toHaveBeenCalledWith(validToken, validPassword);
      });
    });

    it('shows success state after successful submission', async () => {
      renderForm(validToken, jest.fn().mockResolvedValue(undefined));

      await fillAndSubmit();

      expect(await screen.findByText('Password updated')).toBeInTheDocument();
    });

    it('shows a link to sign in from the success state', async () => {
      renderForm(validToken, jest.fn().mockResolvedValue(undefined));

      await fillAndSubmit();

      await screen.findByText('Password updated');
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    });
  });

  describe('invalid or expired token on submit', () => {
    function mockForbiddenError() {
      return {
        isAxiosError: true,
        response: {
          status: 403,
          data: { status: 403, error: 'INVALID_TOKEN', message: 'Invalid token.', details: [] },
        },
      };
    }

    it('shows the invalid link state instead of a generic error', async () => {
      renderForm(validToken, jest.fn().mockRejectedValue(mockForbiddenError()));

      await fillAndSubmit();

      expect(await screen.findByText('Invalid reset link')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not show the success state', async () => {
      renderForm(validToken, jest.fn().mockRejectedValue(mockForbiddenError()));

      await fillAndSubmit();

      await screen.findByText('Invalid reset link');
      expect(screen.queryByText('Password updated')).not.toBeInTheDocument();
    });
  });

  describe('other submission errors', () => {
    it('shows error alert for a non-403 failure', async () => {
      renderForm(
        validToken,
        jest.fn().mockRejectedValue({
          isAxiosError: true,
          response: { status: 500, data: {} },
        })
      );

      await fillAndSubmit();

      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading text while submitting', async () => {
      renderForm(
        validToken,
        jest.fn().mockImplementation(() => new Promise(() => {}))
      );

      await fillAndSubmit();

      expect(await screen.findByText('Resetting...')).toBeInTheDocument();
    });

    it('disables submit button while submitting', async () => {
      renderForm(
        validToken,
        jest.fn().mockImplementation(() => new Promise(() => {}))
      );

      await fillAndSubmit();

      await screen.findByText('Resetting...');
      expect(screen.getByRole('button', { name: /resetting/i })).toBeDisabled();
    });

    it('disables password fields while submitting', async () => {
      renderForm(
        validToken,
        jest.fn().mockImplementation(() => new Promise(() => {}))
      );

      await fillAndSubmit();

      await screen.findByText('Resetting...');
      expect(screen.getByLabelText('New password')).toBeDisabled();
      expect(screen.getByLabelText('Confirm new password')).toBeDisabled();
    });
  });
});
