import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/lib/context/AuthContext';
import { PersonalInfoForm } from '@/components/profile/PersonalInfoForm';
import * as userApi from '@/lib/api/user';

jest.mock('@/lib/context/AuthContext');
jest.mock('@/lib/api/user');

const mockFetchUser = jest.fn();
const mockUpdateUserInfo = userApi.updateUserInfo as jest.MockedFunction<
  typeof userApi.updateUserInfo
>;

const mockUser = {
  userId: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: 'ROLE_USER',
};

function mockUseAuth(overrides = {}) {
  (useAuth as jest.Mock).mockReturnValue({
    user: mockUser,
    fetchUser: mockFetchUser,
    ...overrides,
  });
}

beforeEach(() => {
  mockUseAuth();
  jest.clearAllMocks();
});

describe('PersonalInfoForm', () => {
  describe('view mode', () => {
    it('renders user information in view mode by default', () => {
      render(<PersonalInfoForm />);

      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('07123456789')).toBeInTheDocument();
    });

    it('renders the Edit button in view mode', () => {
      render(<PersonalInfoForm />);

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('switches to edit mode when Edit is clicked', async () => {
      render(<PersonalInfoForm />);

      await userEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByLabelText('First name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    async function enterEditMode() {
      render(<PersonalInfoForm />);
      await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    }

    it('pre-fills form with current user values', async () => {
      await enterEditMode();

      expect(screen.getByLabelText('First name')).toHaveValue('Jane');
      expect(screen.getByLabelText('Last name')).toHaveValue('Doe');
      expect(screen.getByLabelText('Phone number')).toHaveValue('07123456789');
    });

    it('shows Save changes and Cancel buttons', async () => {
      await enterEditMode();

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('returns to view mode when Cancel is clicked', async () => {
      await enterEditMode();

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('resets form values when Cancel is clicked', async () => {
      await enterEditMode();

      await userEvent.clear(screen.getByLabelText('First name'));
      await userEvent.type(screen.getByLabelText('First name'), 'Changed');
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await userEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByLabelText('First name')).toHaveValue('Jane');
    });
  });

  describe('validation', () => {
    async function enterEditMode() {
      render(<PersonalInfoForm />);
      await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    }

    it('shows error when first name is empty', async () => {
      await enterEditMode();

      await userEvent.clear(screen.getByLabelText('First name'));
      await userEvent.tab();

      expect(await screen.findByText('First name is required')).toBeInTheDocument();
    });

    it('shows error when phone number format is invalid', async () => {
      await enterEditMode();

      await userEvent.clear(screen.getByLabelText('Phone number'));
      await userEvent.type(screen.getByLabelText('Phone number'), '1234');
      await userEvent.tab();

      expect(await screen.findByText(/phone number must start with 0/i)).toBeInTheDocument();
    });

    it('does not call updateUserInfo when validation fails', async () => {
      await enterEditMode();

      await userEvent.clear(screen.getByLabelText('First name'));
      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      expect(mockUpdateUserInfo).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    async function enterEditMode() {
      render(<PersonalInfoForm />);
      await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    }

    it('calls updateUserInfo with correct values on submit', async () => {
      mockUpdateUserInfo.mockResolvedValue({
        id: 1,
        userId: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '07123456789',
      });
      await enterEditMode();

      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateUserInfo).toHaveBeenCalledWith({
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '07123456789',
        });
      });
    });

    it('calls fetchUser after successful save', async () => {
      mockUpdateUserInfo.mockResolvedValue({
        id: 1,
        userId: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '07123456789',
      });
      await enterEditMode();

      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => expect(mockFetchUser).toHaveBeenCalledTimes(1));
    });

    it('returns to view mode after successful save', async () => {
      mockUpdateUserInfo.mockResolvedValue({
        id: 1,
        userId: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '07123456789',
      });
      await enterEditMode();

      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });
  });
});
