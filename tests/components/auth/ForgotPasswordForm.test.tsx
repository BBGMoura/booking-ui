import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const validEmail = 'jane@example.com';

function renderForm(onResetPassword = jest.fn()) {
  return { onResetPassword, ...render(<ForgotPasswordForm onResetPassword={onResetPassword} />) };
}

describe('ForgotPasswordForm', () => {
  describe('rendering', () => {
    it('renders email field and submit button', () => {
      renderForm();

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send reset email' })).toBeInTheDocument();
    });

    it('renders back to sign in link', () => {
      renderForm();

      expect(screen.getByRole('link', { name: 'Back to sign in' })).toBeInTheDocument();
    });

    it('does not show error alert on initial render', () => {
      renderForm();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not show success state on initial render', () => {
      renderForm();

      expect(screen.queryByText('Check your inbox')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows required error when submitting with empty email', async () => {
      renderForm();

      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      expect(await screen.findByText('Email is required')).toBeInTheDocument();
    });

    it('shows invalid email error when email format is wrong', async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText('Email'), 'notanemail');
      await userEvent.tab();

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('does not call onResetPassword() when validation fails', async () => {
      const { onResetPassword } = renderForm();

      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      expect(onResetPassword).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls onResetPassword() with the submitted email', async () => {
      const onResetPassword = jest.fn().mockResolvedValue(undefined);
      renderForm(onResetPassword);

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      await waitFor(() => {
        expect(onResetPassword).toHaveBeenCalledWith(validEmail);
      });
    });

    it('shows success state after successful submission', async () => {
      renderForm(jest.fn().mockResolvedValue(undefined));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    });

    it('shows security wording in success state', async () => {
      renderForm(jest.fn().mockResolvedValue(undefined));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      expect(await screen.findByText(/if an account exists for that email/i)).toBeInTheDocument();
    });

    it('shows back to sign in link in success state', async () => {
      renderForm(jest.fn().mockResolvedValue(undefined));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      await screen.findByText('Check your inbox');
      expect(screen.getByRole('link', { name: 'Back to sign in' })).toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('shows error alert after failed API call', async () => {
      renderForm(jest.fn().mockRejectedValue({
        isAxiosError: true,
        response: { status: 404, data: { error: 'No account found.' } },
      }));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });

    it('shows error message from API response', async () => {
      renderForm(jest.fn().mockRejectedValue({
        isAxiosError: true,
        response: { status: 404, data: { error: 'No account found.' } },
      }));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      expect(await screen.findByText('No account found.')).toBeInTheDocument();
    });

    it('does not show success state after failed API call', async () => {
      renderForm(jest.fn().mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, data: {} },
      }));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      await screen.findByRole('alert');
      expect(screen.queryByText('Check your inbox')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows spinner and loading text while submitting', async () => {
      renderForm(jest.fn().mockImplementation(() => new Promise(() => {})));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      expect(await screen.findByText('Sending...')).toBeInTheDocument();
    });

    it('disables submit button while submitting', async () => {
      renderForm(jest.fn().mockImplementation(() => new Promise(() => {})));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      await screen.findByText('Sending...');
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });

    it('disables email field while submitting', async () => {
      renderForm(jest.fn().mockImplementation(() => new Promise(() => {})));

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));

      await screen.findByText('Sending...');
      expect(screen.getByLabelText('Email')).toBeDisabled();
    });
  });
});
