import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterDetailsForm from '@/components/auth/RegisterDetailsForm';
import { useAuth } from '@/lib/context/AuthContext';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/context/AuthContext');

function mockUseAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as jest.Mock).mockReturnValue({
    register: jest.fn(),
    isLoading: false,
    ...overrides,
  });
}

const validEmail = 'jane@example.com';
const validFormValues = {
  firstName: 'Jane',
  lastName: 'Doe',
  phoneNumber: '07112233445',
  password: 'Password1!',
  confirmPassword: 'Password1!',
};

async function fillForm(overrides: Partial<typeof validFormValues> = {}) {
  const values = { ...validFormValues, ...overrides };
  if (values.firstName) await userEvent.type(screen.getByLabelText('First name'), values.firstName);
  if (values.lastName) await userEvent.type(screen.getByLabelText('Last name'), values.lastName);
  if (values.phoneNumber)
    await userEvent.type(screen.getByLabelText('Phone number'), values.phoneNumber);
  if (values.password) await userEvent.type(screen.getByLabelText('Password'), values.password);
  if (values.confirmPassword)
    await userEvent.type(screen.getByLabelText('Confirm password'), values.confirmPassword);
}

beforeEach(() => {
  mockUseAuth();
  jest.clearAllMocks();
});

describe('RegisterDetailsForm', () => {
  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('First name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    });

    it('pre-fills and disables the email field', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      const emailField = screen.getByLabelText('Email');
      expect(emailField).toHaveValue(validEmail);
      expect(emailField).toBeDisabled();
    });

    it('renders create account button', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });

    it('renders sign in link', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('does not show error alert on initial render', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows required errors when submitting empty form', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

      expect(await screen.findByText('First name is required')).toBeInTheDocument();
      expect(await screen.findByText('Last name is required')).toBeInTheDocument();
      expect(await screen.findByText('Phone number is required')).toBeInTheDocument();
      expect(await screen.findByText('Please confirm your password')).toBeInTheDocument();
    });

    it('shows error when first name exceeds 50 characters', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.type(screen.getByLabelText('First name'), 'a'.repeat(51));
      await userEvent.tab();

      expect(
        await screen.findByText('First name must be at most 50 characters')
      ).toBeInTheDocument();
    });

    it('shows error when phone number format is invalid', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.type(screen.getByLabelText('Phone number'), '12345');
      await userEvent.tab();

      expect(
        await screen.findByText(
          'Phone number must start with 0 and be 10-11 digits (e.g. 07112233445)'
        )
      ).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.type(screen.getByLabelText('Password'), 'Password1!');
      await userEvent.type(screen.getByLabelText('Confirm password'), 'DifferentPassword1!');
      await userEvent.tab();

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });

    it('shows password required error when password is empty and field is touched', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

      expect(await screen.findByText('Password is required')).toBeInTheDocument();
    });

    it('does not call register() when validation fails', async () => {
      const mockRegister = jest.fn();
      mockUseAuth({ register: mockRegister });

      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('password requirements checklist', () => {
    it('does not show checklist when password is empty', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.queryByText('8-16 characters')).not.toBeInTheDocument();
    });

    it('shows checklist when user starts typing password', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.type(screen.getByLabelText('Password'), 'a');

      expect(screen.getByText('8-16 characters')).toBeInTheDocument();
    });
  });

  describe('submission', () => {
    it('calls register() with correct data including email from props', async () => {
      const mockRegister = jest.fn().mockResolvedValue(undefined);
      mockUseAuth({ register: mockRegister });

      render(<RegisterDetailsForm email={validEmail} />);
      await fillForm();
      await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          firstName: validFormValues.firstName,
          lastName: validFormValues.lastName,
          email: validEmail,
          phoneNumber: validFormValues.phoneNumber,
          password: validFormValues.password,
        });
      });
    });

    it('redirects to /dashboard on successful registration', async () => {
      const mockRegister = jest.fn().mockResolvedValue(undefined);
      mockUseAuth({ register: mockRegister });

      render(<RegisterDetailsForm email={validEmail} />);
      await fillForm();
      await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('does not redirect on failed registration', async () => {
      const mockRegister = jest.fn().mockRejectedValue(new Error('Registration failed'));
      mockUseAuth({ register: mockRegister });

      render(<RegisterDetailsForm email={validEmail} />);
      await fillForm();
      await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('shows error alert on failed registration', async () => {
      const mockRegister = jest.fn().mockRejectedValue(new Error('Registration failed'));
      mockUseAuth({ register: mockRegister });

      render(<RegisterDetailsForm email={validEmail} />);
      await fillForm();
      await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows spinner and creating account text when isLoading is true', () => {
      mockUseAuth({ isLoading: true });

      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByText('Creating account...')).toBeInTheDocument();
    });

    it('disables submit button when isLoading is true', () => {
      mockUseAuth({ isLoading: true });

      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
    });

    it('disables form fields when isLoading is true', () => {
      mockUseAuth({ isLoading: true });

      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByLabelText('First name')).toBeDisabled();
      expect(screen.getByLabelText('Last name')).toBeDisabled();
      expect(screen.getByLabelText('Phone number')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByLabelText('Confirm password')).toBeDisabled();
    });
  });

  describe('password visibility toggles', () => {
    it('password field is type password by default', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('toggles password to visible when show button is clicked', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    });

    it('confirm password field is type password by default', () => {
      render(<RegisterDetailsForm email={validEmail} />);

      expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
    });

    it('toggles confirm password to visible when show button is clicked', async () => {
      render(<RegisterDetailsForm email={validEmail} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show confirm password' }));

      expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'text');
    });
  });
});
