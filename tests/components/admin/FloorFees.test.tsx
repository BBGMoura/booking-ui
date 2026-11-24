import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { FloorFeesList } from '@/components/admin/FloorFeesList';
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

describe('FloorFeesList', () => {
  it('shows a price and Admin only for floor fees, and Not set for the rest', async () => {
    render(<FloorFeesList />);
    const card = await screen.findByRole('listitem', { name: 'Practice' });
    expect(card).toHaveTextContent('£8.00');
    expect(card).toHaveTextContent('Admin only');
    const other = screen.getByRole('listitem', { name: 'Other' });
    expect(other).toHaveTextContent('Not set');
    expect(other).toHaveTextContent("Can't be booked");
    expect(screen.getByRole('button', { name: 'Edit Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set floor fee for Other' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Turn off/ })).toHaveLength(1);
  });

  it('lists only room-hire booking types, and says why Group class and Closed are missing', async () => {
    mockGet.mockResolvedValue([
      practice,
      { classType: 'GROUP', active: true, pricePerHour: 0, role: 'ROLE_ADMIN' },
      { classType: 'UNAVAILABLE', active: true, pricePerHour: 0, role: 'ROLE_ADMIN' },
    ]);
    render(<FloorFeesList />);
    const list = await screen.findByRole('list', { name: 'Floor Fees' });
    expect(
      Array.from(list.querySelectorAll('li')).map((li) => li.getAttribute('aria-label'))
    ).toEqual(['Private', 'Practice', 'Other']);
    expect(screen.queryByRole('listitem', { name: 'Group' })).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Unavailable' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Group classes and Closed blocks aren't room hire, so they don't have a floor fee."
      )
    ).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<FloorFeesList />);
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('listitem', { name: 'Practice' })).toBeInTheDocument();
  });

  describe('set floor fee dialog', () => {
    it('rejects an invalid price without calling the API', async () => {
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set floor fee for Other' }));
      await userEvent.type(screen.getByLabelText('Price per hour'), '12.');
      await userEvent.click(screen.getByRole('button', { name: 'Save floor fee' }));
      expect(await screen.findByText(/from £0.00 to £999.99/)).toBeInTheDocument();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('ignores letters and digits past a valid price', async () => {
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set floor fee for Other' }));
      const input = screen.getByLabelText('Price per hour');
      await userEvent.type(input, 'ab1c2.5x67');
      expect(input).toHaveValue('12.56');
      await userEvent.clear(input);
      await userEvent.type(input, '1000');
      expect(input).toHaveValue('100');
    });

    it('requires a price', async () => {
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set floor fee for Other' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save floor fee' }));
      expect(await screen.findByText('Price per hour is required')).toBeInTheDocument();
    });

    it('explains what happens to existing bookings', async () => {
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set floor fee for Other' }));
      expect(
        screen.getByText(
          'New bookings use the new floor fee. Existing bookings keep the price they were booked at.'
        )
      ).toBeInTheDocument();
    });

    it('sends ROLE_USER with the price, then toasts and reloads', async () => {
      mockSet.mockResolvedValue({ ...practice, classType: 'PRIVATE', role: 'ROLE_USER' });
      render(<FloorFeesList />);
      await userEvent.click(
        await screen.findByRole('button', { name: 'Set floor fee for Private' })
      );
      await userEvent.type(screen.getByLabelText('Price per hour'), '15.5');
      await userEvent.click(screen.getByRole('button', { name: 'Save floor fee' }));
      await waitFor(() =>
        expect(mockSet).toHaveBeenCalledWith({
          classType: 'PRIVATE',
          pricePerHour: 15.5,
          role: 'ROLE_USER',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Private floor fee saved');
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });

    it('sends ROLE_ADMIN when Admin only is on', async () => {
      mockSet.mockResolvedValue(practice);
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set floor fee for Other' }));
      await userEvent.type(screen.getByLabelText('Price per hour'), '30');
      await userEvent.click(screen.getByRole('switch', { name: 'Admin only' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save floor fee' }));
      await waitFor(() =>
        expect(mockSet).toHaveBeenCalledWith({
          classType: 'OTHER',
          pricePerHour: 30,
          role: 'ROLE_ADMIN',
        })
      );
    });

    it('starts from the current floor fee when editing', async () => {
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Edit Practice' }));
      expect(screen.getByLabelText('Price per hour')).toHaveValue('8.00');
      expect(screen.getByRole('switch', { name: 'Admin only' })).toBeChecked();
    });

    it('shows the API error and keeps the dialog open', async () => {
      mockSet.mockRejectedValue(new Error('nope'));
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Set floor fee for Other' }));
      await userEvent.type(screen.getByLabelText('Price per hour'), '5');
      await userEvent.click(screen.getByRole('button', { name: 'Save floor fee' }));
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('turn off', () => {
    it('asks first, and does nothing on Cancel', async () => {
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Turn off Practice' }));
      expect(screen.getByText('Turn off the Practice floor fee?')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveTextContent(
        "No one will be able to book Practice until you set a new floor fee. Existing bookings aren't affected."
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOff).not.toHaveBeenCalled();
    });

    it('turns the floor fee off on confirm, then toasts and reloads', async () => {
      mockOff.mockResolvedValue(undefined);
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Turn off Practice' }));
      await userEvent.click(screen.getByRole('button', { name: 'Turn off' }));
      await waitFor(() => expect(mockOff).toHaveBeenCalledWith('PRACTICE'));
      expect(toast.success).toHaveBeenCalledWith('Practice floor fee turned off');
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });

    it('shows the error when turning off fails', async () => {
      mockOff.mockRejectedValue(new Error('nope'));
      render(<FloorFeesList />);
      await userEvent.click(await screen.findByRole('button', { name: 'Turn off Practice' }));
      await userEvent.click(screen.getByRole('button', { name: 'Turn off' }));
      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });
});
