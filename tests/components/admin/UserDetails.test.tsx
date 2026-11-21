import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { UserDetails } from '@/components/admin/UserDetails';
import { getUser, setUserEnabled } from '@/lib/api/user';
import type { UserProfile } from '@/lib/types/user';

jest.mock('@/lib/api/user', () => ({ getUser: jest.fn(), setUserEnabled: jest.fn() }));
jest.mock('@/lib/api/booking', () => ({ getUserBookings: jest.fn() }));
jest.mock('@/lib/context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockGetUser = jest.mocked(getUser);
const mockSetEnabled = jest.mocked(setUserEnabled);

const profile = (over: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'u2',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phoneNumber: '07000000001',
  enabled: true,
  role: 'ROLE_USER',
  ...over,
});

beforeEach(() => {
  mockGetUser.mockReset();
  mockSetEnabled.mockReset();
});

describe('UserDetails', () => {
  it('shows the user’s name, email and phone', async () => {
    mockGetUser.mockResolvedValue(profile());
    render(<UserDetails userUid="u2" />);

    expect(await screen.findByRole('heading', { name: 'Jane Smith' })).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('07000000001')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(mockGetUser).toHaveBeenCalledWith('u2');
  });

  it('offers Disable for another active user', async () => {
    mockGetUser.mockResolvedValue(profile());
    render(<UserDetails userUid="u2" />);
    expect(await screen.findByRole('button', { name: 'Disable' })).toBeInTheDocument();
  });

  it('hides Disable on your own account', async () => {
    mockGetUser.mockResolvedValue(profile({ uid: 'me', role: 'ROLE_ADMIN' }));
    render(<UserDetails userUid="me" />);

    await screen.findByRole('heading', { name: 'Jane Smith' });
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
  });

  it('enables a disabled user and reloads their details', async () => {
    mockGetUser.mockResolvedValueOnce(profile({ enabled: false }));
    mockGetUser.mockResolvedValue(profile());
    mockSetEnabled.mockResolvedValue();
    const user = userEvent.setup();
    render(<UserDetails userUid="u2" />);

    await user.click(await screen.findByRole('button', { name: 'Enable' }));

    expect(mockSetEnabled).toHaveBeenCalledWith('u2', true);
    expect(toast.success).toHaveBeenCalledWith('Jane Smith enabled');
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument());
  });

  it('shows an invited user without Disable or Enable', async () => {
    mockGetUser.mockResolvedValue(
      profile({ firstName: null, lastName: null, phoneNumber: null, enabled: false })
    );
    render(<UserDetails userUid="u2" />);

    expect(await screen.findByText('Invite sent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /able/ })).not.toBeInTheDocument();
  });

  it('says when the user does not exist', async () => {
    const error = new AxiosError('Not found');
    error.response = { status: 404, data: {} } as AxiosError['response'];
    mockGetUser.mockRejectedValue(error);
    render(<UserDetails userUid="nope" />);

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });
});
