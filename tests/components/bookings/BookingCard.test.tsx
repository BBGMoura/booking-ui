import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { BookingCard } from '@/components/bookings/BookingCard';
import { cancelBooking } from '@/lib/api/booking';
import type { BookingView } from '@/lib/types/booking';

jest.mock('@/lib/api/booking', () => ({ cancelBooking: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockCancel = jest.mocked(cancelBooking);

// The bookings below start on 1 Nov 2026 at 10:00 UTC.
const BEFORE_START = new Date('2026-10-01T09:00:00Z').getTime();
const AFTER_START = new Date('2026-11-01T10:05:00Z').getTime();
let mockNow: jest.SpyInstance<number>;

beforeEach(() => {
  mockCancel.mockReset();
  jest.mocked(toast.success).mockReset();
  mockNow = jest.spyOn(Date, 'now').mockReturnValue(BEFORE_START);
});

afterEach(() => mockNow.mockRestore());

const booking = (over: Partial<BookingView> = {}): BookingView => ({
  uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  userUid: 'u1',
  room: 'ASTAIRE',
  status: 'BOOKED',
  shareable: true,
  classType: 'PRIVATE',
  dateFrom: '2026-11-01T10:00:00Z',
  dateTo: '2026-11-01T11:00:00Z',
  totalPrice: 20,
  ...over,
});

describe('BookingCard', () => {
  it('shows the date, time, room, booking type, price and reference without expanding', () => {
    render(<BookingCard booking={booking()} />);

    expect(
      screen.getByRole('article', { name: 'Sunday, 1 November 2026, 10:00 to 11:00' })
    ).toBeInTheDocument();
    expect(screen.getByText('10:00–11:00')).toBeInTheDocument();
    expect(screen.getByText('Astaire')).toBeInTheDocument();
    expect(screen.getByText('Private lesson')).toBeInTheDocument();
    expect(screen.getByText('£20.00')).toBeInTheDocument();
    expect(screen.getByText('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks shared rooms only', () => {
    const { rerender } = render(<BookingCard booking={booking()} />);
    expect(screen.getByText('Shared room')).toBeInTheDocument();

    rerender(<BookingCard booking={booking({ shareable: false })} />);
    expect(screen.queryByText('Shared room')).not.toBeInTheDocument();
  });

  it('labels only cancelled bookings', () => {
    const { rerender } = render(<BookingCard booking={booking({ status: 'CANCELLED' })} />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();

    for (const status of ['BOOKED', 'COMPLETED'] as const) {
      rerender(<BookingCard booking={booking({ status })} />);
      expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
      expect(screen.queryByText('Completed')).not.toBeInTheDocument();
      expect(screen.queryByText('Booked')).not.toBeInTheDocument();
    }
  });

  it('offers no Cancel button on a booking that is already cancelled', () => {
    render(<BookingCard booking={booking({ status: 'CANCELLED' })} onCancelled={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('offers no Cancel button once the booking has started', () => {
    mockNow.mockReturnValue(AFTER_START);
    render(<BookingCard booking={booking()} onCancelled={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('refuses to cancel if the booking starts while the confirmation is open', async () => {
    const onCancelled = jest.fn();
    render(<BookingCard booking={booking()} onCancelled={onCancelled} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    mockNow.mockReturnValue(AFTER_START);
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      "This booking has started, so it can't be cancelled."
    );
    expect(mockCancel).not.toHaveBeenCalled();
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('asks for confirmation, then cancels and tells the caller', async () => {
    mockCancel.mockResolvedValue(undefined);
    const onCancelled = jest.fn();
    render(<BookingCard booking={booking()} onCancelled={onCancelled} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(screen.getByText("Cancel this booking? This can't be undone.")).toBeInTheDocument();
    expect(mockCancel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(mockCancel).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(onCancelled).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(toast.success).toHaveBeenCalledWith('Booking cancelled');
    // The buttons are gone, so focus stays on the card rather than the page top.
    expect(screen.getByRole('article')).toHaveFocus();
  });

  it('goes back without cancelling when the user keeps the booking', async () => {
    render(<BookingCard booking={booking()} onCancelled={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

    expect(mockCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });

  it('shows the error and leaves the booking alone when cancelling fails', async () => {
    mockCancel.mockRejectedValue(new AxiosError('Network Error'));
    const onCancelled = jest.fn();
    render(<BookingCard booking={booking()} onCancelled={onCancelled} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect');
    expect(onCancelled).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables the buttons while the cancel is in flight', async () => {
    let resolve!: () => void;
    mockCancel.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const onCancelled = jest.fn();
    render(<BookingCard booking={booking()} onCancelled={onCancelled} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(screen.getByRole('button', { name: 'Yes, cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeDisabled();
    expect(mockCancel).toHaveBeenCalledTimes(1);

    await act(async () => resolve());
    expect(onCancelled).toHaveBeenCalledTimes(1);
  });
});
