import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterEmailForm from '@/components/auth/RegisterEmailForm';
import { checkInvite } from '@/lib/api/auth';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/api/auth');

const mockOnSuccess = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterEmailForm', () => {
  describe('rendering', () => {
    it('renders email field and continue button', () => {
      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows required error when submitting empty form', async () => {
      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByText('Email is required')).toBeInTheDocument();
    });

    it('shows invalid email error when email format is wrong', async () => {
      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'notanemail');
      await userEvent.tab();

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('does not call checkInvite when validation fails', async () => {
      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(checkInvite).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls checkInvite with the email on valid submission', async () => {
      (checkInvite as jest.Mock).mockResolvedValue({ email: 'jane@example.com', invited: true });

      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(checkInvite).toHaveBeenCalledWith('jane@example.com');
      });
    });

    it('calls onSuccess with email when invited', async () => {
      (checkInvite as jest.Mock).mockResolvedValue({ email: 'jane@example.com', invited: true });

      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('jane@example.com');
      });
    });

    it('shows not invited error when email is not invited', async () => {
      (checkInvite as jest.Mock).mockResolvedValue({ email: 'jane@example.com', invited: false });

      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'This email has not been invited. Please contact an administrator.'
      );
    });

    it('does not call onSuccess when email is not invited', async () => {
      (checkInvite as jest.Mock).mockResolvedValue({ email: 'jane@example.com', invited: false });

      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });

    it('shows network error when checkInvite throws', async () => {
      (checkInvite as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows spinner and checking text when loading', async () => {
      (checkInvite as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByText('Checking...')).toBeInTheDocument();
    });

    it('disables button and field when loading', async () => {
      (checkInvite as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<RegisterEmailForm onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeDisabled();
      });
    });
  });
});
