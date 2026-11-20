import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingCard } from '@/components/bookings/BookingCard';
import type { BookingView } from '@/lib/types/booking';

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
  it('shows room and booking type, and hides the extra details until expanded', () => {
    render(<BookingCard booking={booking()} />);

    expect(screen.getByText('Astaire · Private lesson')).toBeInTheDocument();
    expect(screen.queryByText('£20.00')).not.toBeInTheDocument();
    expect(screen.queryByText('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).not.toBeInTheDocument();
  });

  it('shows price, shared room and booking reference when expanded', async () => {
    render(<BookingCard booking={booking()} />);

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText('£20.00')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBeInTheDocument();
  });

  it('says No when the room is not shared', async () => {
    render(<BookingCard booking={booking({ shareable: false })} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('No')).toBeInTheDocument();
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
});
