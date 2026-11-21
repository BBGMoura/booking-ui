import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { RoomRatesList } from '@/components/admin/RoomRatesList';
import { deactivateDanceClass, getActiveDanceClasses, setDanceClass } from '@/lib/api/danceClass';
import type { DanceClass } from '@/lib/types/danceClass';

jest.mock('@/lib/api/danceClass', () => ({
  getActiveDanceClasses: jest.fn(),
  setDanceClass: jest.fn(),
  deactivateDanceClass: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// The Switch measures itself with ResizeObserver, which jsdom doesn't have.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockGet = jest.mocked(getActiveDanceClasses);
const mockSet = jest.mocked(setDanceClass);
const mockOff = jest.mocked(deactivateDanceClass);

const practice: DanceClass = {
  classType: 'PRACTICE',
  active: true,
  pricePerHour: 8,
  role: 'ROLE_ADMIN',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue([practice]);
});

describe('RoomRatesList', () => {
  it('shows a price and Admin only for rates, and Not set for the rest', async () => {
    render(<RoomRatesList />);
    const row = (await screen.findByRole('rowheader', { name: 'Practice' })).closest('tr')!;
    expect(row).toHaveTextContent('£8.00');
    expect(row).toHaveTextContent('Yes');
    const closed = screen.getByRole('rowheader', { name: 'Closed' }).closest('tr')!;
    expect(closed).toHaveTextContent("Not set: can't be booked");
    expect(screen.getByRole('button', { name: 'Edit Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set rate for Closed' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Turn off/ })).toHaveLength(1);
  });

  it('shows an error with retry', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<RoomRatesList />);
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('rowheader', { name: 'Practice' })).toBeInTheDocument();
  });

  describe('set rate dialog', () => {
    it('rejects an invalid price without calling the API', async () => {
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set rate for Closed' }));
      await userEvent.type(screen.getByLabelText('Price per hour'), '1000');
      await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
      expect(await screen.findByText(/from £0.00 to £999.99/)).toBeInTheDocument();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('requires a price', async () => {
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set rate for Closed' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
      expect(await screen.findByText('Price per hour is required')).toBeInTheDocument();
    });

    it('explains what happens to existing bookings', async () => {
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set rate for Closed' }));
      expect(
        screen.getByText(
          'New bookings use the new rate. Existing bookings keep the price they were booked at.'
        )
      ).toBeInTheDocument();
    });

    it('sends ROLE_USER with the price, then toasts and reloads', async () => {
      mockSet.mockResolvedValue({ ...practice, classType: 'GROUP', role: 'ROLE_USER' });
      render(<RoomRatesList />);
      await userEvent.click(
        await screen.findByRole('button', { name: 'Set rate for Group class' })
      );
      await userEvent.type(screen.getByLabelText('Price per hour'), '15.5');
      await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
      await waitFor(() =>
        expect(mockSet).toHaveBeenCalledWith({
          classType: 'GROUP',
          pricePerHour: 15.5,
          role: 'ROLE_USER',
        })
      );
      expect(toast.success).toHaveBeenCalled();
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });

    it('sends ROLE_ADMIN when Admin only is on', async () => {
      mockSet.mockResolvedValue(practice);
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set rate for Other' }));
      await userEvent.type(screen.getByLabelText('Price per hour'), '30');
      await userEvent.click(screen.getByRole('switch', { name: 'Admin only' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
      await waitFor(() =>
        expect(mockSet).toHaveBeenCalledWith({
          classType: 'OTHER',
          pricePerHour: 30,
          role: 'ROLE_ADMIN',
        })
      );
    });

    it('starts from the current rate when editing', async () => {
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Edit Practice' }));
      expect(screen.getByLabelText('Price per hour')).toHaveValue('8.00');
      expect(screen.getByRole('switch', { name: 'Admin only' })).toBeChecked();
    });

    it('shows the API error and keeps the dialog open', async () => {
      mockSet.mockRejectedValue(new Error('nope'));
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set rate for Closed' }));
      await userEvent.type(screen.getByLabelText('Price per hour'), '5');
      await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('turn off', () => {
    it('asks first, and does nothing on Cancel', async () => {
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Turn off Practice' }));
      expect(screen.getByText('Turn off the Practice rate?')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveTextContent(
        "No one will be able to book Practice until you set a new rate. Existing bookings aren't affected."
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOff).not.toHaveBeenCalled();
    });

    it('turns the rate off on confirm, then toasts and reloads', async () => {
      mockOff.mockResolvedValue(undefined);
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Turn off Practice' }));
      await userEvent.click(screen.getByRole('button', { name: 'Turn off' }));
      await waitFor(() => expect(mockOff).toHaveBeenCalledWith('PRACTICE'));
      expect(toast.success).toHaveBeenCalled();
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });

    it('shows the error when turning off fails', async () => {
      mockOff.mockRejectedValue(new Error('nope'));
      render(<RoomRatesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Turn off Practice' }));
      await userEvent.click(screen.getByRole('button', { name: 'Turn off' }));
      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });
});
