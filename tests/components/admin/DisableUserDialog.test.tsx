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

  it('says how many upcoming bookings will be cancelled and that they will not come back', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(4));
    setup();

    expect(await screen.findByText(/This also cancels all/)).toHaveTextContent(
      "This also cancels all 4 of their upcoming bookings. They won't come back if you enable Jane again."
    );
  });

  it('uses the singular for one upcoming booking', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(1));
    setup();

    const p = await screen.findByText(/This also cancels their/);
    expect(p).toHaveTextContent(
      "This also cancels their 1 upcoming booking. It won't come back if you enable Jane again."
    );
  });

  it('leaves the bookings sentence out when there are none', async () => {
    mockGetUserBookings.mockResolvedValue(upcoming(0));
    setup();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Disable' })).toBeEnabled());
    expect(screen.queryByText(/This also cancels/)).not.toBeInTheDocument();
    expect(screen.getByText(/won't be able to sign in/)).toBeInTheDocument();
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
