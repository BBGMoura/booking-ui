import { useAuth } from '@/lib/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SESSION_EXPIRED_KEY } from '@/lib/api/auth';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/context/AuthContext');

jest.mock('sonner', () => ({
  toast: {
    warning: jest.fn(),
  },
}));

import { toast } from 'sonner';

function mockUseAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as jest.Mock).mockReturnValue({
    login: jest.fn(),
    isLoading: false,
    ...overrides,
  });
}

const validEmail = 'jane@example.com';
const validPassword = 'Password1!';

beforeEach(() => {
  mockUseAuth();
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe('LoginForm', () => {
  describe('rendering', () => {
    it('renders email field, password field and submit button', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      render(<LoginForm />);

      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('renders register link', () => {
      render(<LoginForm />);

      expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
    });

    it('does not show error alert on initial render', () => {
      render(<LoginForm />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('session expired toast', () => {
    it('shows session expired toast when session_expired flag is set', async () => {
      sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');

      render(<LoginForm />);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith('Session expired', {
          description: 'Please sign in again to continue.',
        });
      });
    });

    it('clears the session_expired flag after showing the toast', async () => {
      sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');

      render(<LoginForm />);

      await waitFor(() => {
        expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
      });
    });

    it('does not show toast when session_expired flag is not set', () => {
      render(<LoginForm />);

      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('shows required errors for both fields when submitting empty form', async () => {
      render(<LoginForm />);

      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByText('Email is required')).toBeInTheDocument();
      expect(await screen.findByText('Password is required')).toBeInTheDocument();
    });

    it('shows invalid email error when email format is wrong', async () => {
      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email'), 'notanemail');
      await userEvent.tab();

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('shows password too short error when password is under 8 characters', async () => {
      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Password'), 'short');
      await userEvent.tab();

      expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    });

    it('does not call login() when validation fails', async () => {
      const mockLogin = jest.fn();
      mockUseAuth({ login: mockLogin });

      render(<LoginForm />);

      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls login() with email and password on valid submission', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      mockUseAuth({ login: mockLogin });

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.type(screen.getByLabelText('Password'), validPassword);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: validEmail,
          password: validPassword,
        });
      });
    });

    it('redirects to /dashboard on successful login', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      mockUseAuth({ login: mockLogin });

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.type(screen.getByLabelText('Password'), validPassword);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('does not redirect to /dashboard on failed login', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      mockUseAuth({ login: mockLogin });

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.type(screen.getByLabelText('Password'), validPassword);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('clears password field on failed login', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      mockUseAuth({ login: mockLogin });

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.type(screen.getByLabelText('Password'), validPassword);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toHaveValue('');
      });
    });
  });

  describe('error display', () => {
    it('shows error alert after failed login', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      mockUseAuth({ login: mockLogin });

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email'), validEmail);
      await userEvent.type(screen.getByLabelText('Password'), validPassword);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows spinner and loading text when isLoading is true', () => {
      mockUseAuth({ isLoading: true });

      render(<LoginForm />);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    it('disables submit button when isLoading is true', () => {
      mockUseAuth({ isLoading: true });

      render(<LoginForm />);

      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    it('disables email and password fields when isLoading is true', () => {
      mockUseAuth({ isLoading: true });

      render(<LoginForm />);

      expect(screen.getByLabelText('Email')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
    });
  });

  describe('password visibility toggle', () => {
    it('password field is type password by default', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('toggles password to visible when show button is clicked', async () => {
      render(<LoginForm />);

      await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    });

    it('toggles password back to hidden on second click', async () => {
      render(<LoginForm />);

      await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
      await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });
  });
});
