import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { BookingDetailsPopover } from '@/components/bookings/BookingDetailsPopover';
import { cancelBooking, cancelBookingAsAdmin } from '@/lib/api/booking';
import type { BookingDetails } from '@/lib/utils/calendarEvents';

jest.mock('@/lib/api/booking', () => ({
  cancelBooking: jest.fn(),
  cancelBookingAsAdmin: jest.fn(),
}));

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);
const iso = (d: Date) => d.toISOString();

const details = (over: Partial<BookingDetails> = {}): BookingDetails => ({
  uid: 'b1',
  start: iso(FUTURE),
  end: iso(new Date(FUTURE.getTime() + 60 * 60 * 1000)),
  classType: 'PRIVATE',
  shareable: true,
  cancellable: true,
  ...over,
});

const setup = (d: BookingDetails, isAdmin = false) => {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  const onClose = jest.fn();
  const onCancelled = jest.fn();
  render(
    <BookingDetailsPopover
      details={d}
      anchor={anchor}
      isAdmin={isAdmin}
      onClose={onClose}
      onCancelled={onCancelled}
    />
  );
  return { onClose, onCancelled, anchor };
};

afterEach(() => document.querySelectorAll('body > button').forEach((b) => b.remove()));

beforeEach(() => {
  jest.mocked(cancelBooking).mockReset().mockResolvedValue();
  jest.mocked(cancelBookingAsAdmin).mockReset().mockResolvedValue();
});

describe('BookingDetailsPopover', () => {
  it('shows class type and room as the title, then the time', () => {
    setup(details({ room: 'FOSSE' }));
    expect(screen.getByText('Private · Fosse')).toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}–\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('shows the name, shareable, price and a non-default status when given', () => {
    setup(details({ bookerName: 'Jane Smith', price: 12.5, status: 'COMPLETED' }), true);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Shareable')).toBeInTheDocument();
    expect(screen.getByText('12.50')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('leaves out the usual or empty facts: booked status, zero price, not shareable', () => {
    setup(details({ shareable: false, price: 0, status: 'BOOKED', cancellable: false }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/booked/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('labels the cancel button "Cancel" but names it fully for screen readers', () => {
    setup(details());
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toHaveTextContent(/^Cancel$/);
  });

  it('hides cancel for a booking that has already started', () => {
    setup(details({ start: iso(new Date(Date.now() - 60_000)) }), true);
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before an admin cancels, then calls the admin endpoint', async () => {
    const { onCancelled, onClose } = setup(details(), true);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(cancelBookingAsAdmin).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(cancelBookingAsAdmin).toHaveBeenCalledWith('b1');
    expect(cancelBooking).not.toHaveBeenCalled();
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('b1'));
    expect(onClose).toHaveBeenCalled();
  });

  it('lets a teacher cancel their own booking through the teacher endpoint', async () => {
    setup(details());
    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));
    expect(cancelBooking).toHaveBeenCalledWith('b1');
  });

  it('goes back without cancelling when the user keeps the booking', async () => {
    setup(details(), true);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
    expect(cancelBookingAsAdmin).not.toHaveBeenCalled();
  });

  it("shows the backend's message when cancelling fails, and stays open", async () => {
    const error = new AxiosError('fail', '409', undefined, undefined, {
      status: 409,
      data: { message: 'Booking already cancelled' },
    } as never);
    jest.mocked(cancelBookingAsAdmin).mockRejectedValue(error);
    const { onCancelled, onClose } = setup(details(), true);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Booking already cancelled');
    expect(onCancelled).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes with Escape', async () => {
    const { onClose } = setup(details());
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
