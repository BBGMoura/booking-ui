import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { UserDetails } from '@/components/admin/UserDetails';
import { cancelBookingAsAdmin, getUserBookings } from '@/lib/api/booking';
import { getUser, setUserEnabled } from '@/lib/api/user';
import type { UserProfile } from '@/lib/types/user';

jest.mock('@/lib/api/user', () => ({ getUser: jest.fn(), setUserEnabled: jest.fn() }));
jest.mock('@/lib/api/booking', () => ({
  getUserBookings: jest.fn(),
  cancelBookingAsAdmin: jest.fn(),
}));
let mockMe: { uid: string } | null = { uid: 'me' };
jest.mock('@/lib/context/AuthContext', () => ({ useAuth: () => ({ user: mockMe }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockGetUser = jest.mocked(getUser);
const mockSetEnabled = jest.mocked(setUserEnabled);
const mockUserBookings = jest.mocked(getUserBookings);
const mockCancel = jest.mocked(cancelBookingAsAdmin);

const upcomingBooking = {
  uid: 'b1',
  userUid: 'u2',
  room: 'BUSSELL' as const,
  status: 'BOOKED' as const,
  shareable: false,
  classType: 'PRACTICE' as const,
  dateFrom: '2099-11-01T10:00:00Z',
  dateTo: '2099-11-01T11:00:00Z',
  totalPrice: 10,
};
const bookingsPage = (content: (typeof upcomingBooking)[]) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages: 1 },
});

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
  mockMe = { uid: 'me' };
  mockGetUser.mockReset();
  mockSetEnabled.mockReset();
  mockUserBookings.mockReset();
  mockCancel.mockReset();
  mockUserBookings.mockResolvedValue(bookingsPage([]));
});

describe('UserDetails', () => {
  it('shows the user’s name, email and phone', async () => {
    mockGetUser.mockResolvedValue(profile());
    render(<UserDetails userUid="u2" />);

    expect(await screen.findByRole('heading', { name: 'Jane Smith' })).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('07000000001')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
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
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
  });

  it('hides Disable until the logged-in user is known', async () => {
    mockMe = null;
    mockGetUser.mockResolvedValue(profile());
    render(<UserDetails userUid="u2" />);

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
    expect(screen.getByText('Not registered yet: no bookings')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Upcoming' })).not.toBeInTheDocument();
    expect(mockUserBookings).not.toHaveBeenCalled();
  });

  it('lists upcoming bookings for the user, 10 to a page, soonest first', async () => {
    mockUserBookings.mockResolvedValue(bookingsPage([upcomingBooking]));
    mockGetUser.mockResolvedValue(profile());
    render(<UserDetails userUid="u2" />);

    expect(await screen.findByText('Bussell')).toBeInTheDocument();
    expect(mockUserBookings).toHaveBeenCalledWith('u2', {
      dateFrom: expect.any(String),
      order: 'ASC',
      page: 0,
      size: 10,
    });
  });

  it('loads past bookings, latest first, from the Past tab', async () => {
    mockGetUser.mockResolvedValue(profile());
    const user = userEvent.setup();
    render(<UserDetails userUid="u2" />);

    await user.click(await screen.findByRole('tab', { name: 'Past' }));

    await waitFor(() =>
      expect(mockUserBookings).toHaveBeenCalledWith('u2', {
        dateTo: expect.any(String),
        order: 'DESC',
        page: 0,
        size: 10,
      })
    );
  });

  it('cancels an upcoming booking as an admin', async () => {
    mockUserBookings.mockResolvedValue(bookingsPage([upcomingBooking]));
    mockGetUser.mockResolvedValue(profile());
    mockCancel.mockResolvedValue();
    const user = userEvent.setup();
    render(<UserDetails userUid="u2" />);

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    expect(mockCancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('b1'));
    expect(toast.success).toHaveBeenCalledWith('Booking cancelled');
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  });

  it('says when the user does not exist', async () => {
    const error = new AxiosError('Not found');
    error.response = { status: 404, data: {} } as AxiosError['response'];
    mockGetUser.mockRejectedValue(error);
    render(<UserDetails userUid="nope" />);

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });

  it('links back to the users list with the search it came from', async () => {
    mockGetUser.mockResolvedValue(profile());
    render(<UserDetails userUid="u2" backHref="/admin/users?search=jane" />);

    expect(await screen.findByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/admin/users?search=jane'
    );
  });
});
