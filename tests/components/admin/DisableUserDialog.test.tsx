import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { DisableUserDialog } from '@/components/admin/DisableUserDialog';
import { getUserBookings } from '@/lib/api/booking';
import { setUserEnabled } from '@/lib/api/user';
import type { UserProfile } from '@/lib/types/user';

jest.mock('@/lib/api/booking', () => ({ getUserBookings: jest.fn() }));
jest.mock('@/lib/api/user', () => ({ setUserEnabled: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockGetUserBookings = jest.mocked(getUserBookings);
const mockSetEnabled = jest.mocked(setUserEnabled);

const jane: UserProfile = {
  uid: 'u2',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phoneNumber: '07000000001',
  enabled: true,
  role: 'ROLE_USER',
};

const upcoming = (totalElements: number) => ({
  content: [],
  page: { size: 1, number: 0, totalElements, totalPages: totalElements },
});

function setup() {
  const onOpenChange = jest.fn();
  const onDisabled = jest.fn();
  render(
    <DisableUserDialog user={jane} open onOpenChange={onOpenChange} onDisabled={onDisabled} />
  );
  return { onOpenChange, onDisabled, user: userEvent.setup() };
}

beforeEach(() => {
  mockGetUserBookings.mockReset();
  mockSetEnabled.mockReset();
});

describe('DisableUserDialog', () => {
  it('counts only upcoming booked bookings', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(0));
    setup();
    await waitFor(() =>
      expect(mockGetUserBookings).toHaveBeenCalledWith(
        'u2',
        expect.objectContaining({ status: 'BOOKED', size: 1, dateFrom: expect.any(String) })
      )
    );
  });

  it('says how many upcoming bookings will be cancelled', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(4));
    setup();

    expect(
      await screen.findByText(
        'Disabling this account removes their access to the Booking Portal and cancels their 4 upcoming bookings.'
      )
    ).toBeInTheDocument();
  });

  it('uses the singular for one upcoming booking', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(1));
    setup();

    expect(
      await screen.findByText(
        'Disabling this account removes their access to the Booking Portal and cancels their upcoming booking.'
      )
    ).toBeInTheDocument();
  });

  it('leaves the bookings out when there are none', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(0));
    setup();

    expect(
      await screen.findByText('Disabling this account removes their access to the Booking Portal.')
    ).toBeInTheDocument();
  });

  it('still mentions the bookings when they could not be counted', async () => {
    mockGetUserBookings.mockRejectedValue(new Error('boom'));
    setup();

    expect(
      await screen.findByText(
        'Disabling this account removes their access to the Booking Portal and cancels their upcoming bookings.'
      )
    ).toBeInTheDocument();
  });

  it('disables the user, shows a toast and tells the page', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(2));
    mockSetEnabled.mockResolvedValue();
    const { user, onOpenChange, onDisabled } = setup();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Disable' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Disable' }));

    await waitFor(() => expect(mockSetEnabled).toHaveBeenCalledWith('u2', false));
    expect(toast.success).toHaveBeenCalledWith('Jane Smith disabled');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDisabled).toHaveBeenCalled();
  });
});
