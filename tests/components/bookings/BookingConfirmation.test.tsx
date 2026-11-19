import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingConfirmation } from '@/components/bookings/BookingConfirmation';
import type { BookingView } from '@/lib/types/booking';

const saved: BookingView = {
  uid: 'b1',
  userUid: 'u1',
  room: 'FOSSE',
  status: 'BOOKED',
  shareable: true,
  classType: 'PRIVATE',
  // Local times, so the test doesn't depend on the machine's time zone.
  dateFrom: new Date(2026, 10, 19, 15, 0).toISOString(),
  dateTo: new Date(2026, 10, 19, 16, 15).toISOString(),
  totalPrice: 25,
};

const row = (label: string) => screen.getByText(label).closest('div');

describe('BookingConfirmation', () => {
  it('shows the saved booking with the price the backend charged', () => {
    render(<BookingConfirmation booking={saved} onDone={jest.fn()} />);

    expect(screen.getByText('You’re booked!')).toBeInTheDocument();
    expect(screen.getByText('Fosse · Thu 19 Nov, 15:00')).toBeInTheDocument();
    expect(row('Date')).toHaveTextContent('Thu 19 Nov 2026');
    expect(row('Time')).toHaveTextContent('15:00–16:15');
    expect(row('Time')).toHaveTextContent('1 hr 15 min');
    expect(row('Class')).toHaveTextContent('Private');
    expect(row('Shareable')).toHaveTextContent('Yes');
    expect(screen.getByText('Total').closest('dl')).toHaveTextContent('£25.00');
  });

  it('says when a booking is not shareable', () => {
    render(<BookingConfirmation booking={{ ...saved, shareable: false }} onDone={jest.fn()} />);

    expect(row('Shareable')).toHaveTextContent('No');
  });

  it('closes on Done', async () => {
    const onDone = jest.fn();
    render(<BookingConfirmation booking={saved} onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(onDone).toHaveBeenCalled();
  });
});
