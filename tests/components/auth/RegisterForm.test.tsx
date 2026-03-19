import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from '@/components/auth/RegisterForm';
import { checkInvite } from '@/lib/api/auth';
import { useAuth } from '@/lib/context/AuthContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/api/auth');
jest.mock('@/lib/context/AuthContext');

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({
    register: jest.fn(),
    isLoading: false,
  });
});

describe('RegisterForm', () => {
  describe('rendering', () => {
    it('renders the stepper with both step labels', () => {
      render(<RegisterForm />);

      expect(screen.getByText('Email check')).toBeInTheDocument();
      expect(screen.getByText('Your details')).toBeInTheDocument();
    });

    it('renders step 1 email form by default', () => {
      render(<RegisterForm />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    it('renders the logo', () => {
      render(<RegisterForm />);

      expect(screen.getByAltText('Logo')).toBeInTheDocument();
    });

    it('renders the card title', () => {
      render(<RegisterForm />);

      expect(screen.getByText('Create an account')).toBeInTheDocument();
    });
  });

  describe('step transition', () => {
    it('advances to step 2 when email is invited', async () => {
      (checkInvite as jest.Mock).mockResolvedValue({
        email: 'jane@example.com',
        invited: true,
      });

      render(<RegisterForm />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });

    it('passes the invited email to step 2', async () => {
      (checkInvite as jest.Mock).mockResolvedValue({
        email: 'jane@example.com',
        invited: true,
      });

      render(<RegisterForm />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      const emailField = await screen.findByDisplayValue('jane@example.com');
      expect(emailField).toBeDisabled();
    });

    it('stays on step 1 when email is not invited', async () => {
      (checkInvite as jest.Mock).mockResolvedValue({
        email: 'unknown@example.com',
        invited: false,
      });

      render(<RegisterForm />);

      await userEvent.type(screen.getByLabelText('Email'), 'unknown@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
    });
  });
});
