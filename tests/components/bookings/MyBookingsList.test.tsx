import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MyBookingsList } from '@/components/bookings/MyBookingsList';
import { cancelBooking, getBookings } from '@/lib/api/booking';
import type { BookingView, Page } from '@/lib/types/booking';

jest.mock('@/lib/api/booking', () => ({ getBookings: jest.fn(), cancelBooking: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const booking = (uid: string, over: Partial<BookingView> = {}): BookingView => ({
  uid,
  userUid: 'u1',
  room: 'BUSSELL',
  status: 'BOOKED',
  shareable: false,
  classType: 'PRACTICE',
  dateFrom: '2026-11-01T10:00:00Z',
  dateTo: '2026-11-01T11:00:00Z',
  totalPrice: 10,
  ...over,
});

const page = (content: BookingView[], number = 0, totalPages = 1): Page<BookingView> => ({
  content,
  page: { size: 10, number, totalElements: content.length, totalPages },
});

const mockGet = jest.mocked(getBookings);

beforeEach(() => mockGet.mockReset());

describe('MyBookingsList', () => {
  it('requests upcoming bookings soonest first, 10 per page', async () => {
    mockGet.mockResolvedValue(page([booking('b1')]));
    render(<MyBookingsList tab="upcoming" />);

    await screen.findByText('Bussell');

    const params = mockGet.mock.calls[0][0]!;
    expect(params).toEqual({
      dateFrom: expect.any(String),
      order: 'ASC',
      page: 0,
      size: 10,
    });
    expect(Number.isNaN(Date.parse(params.dateFrom!))).toBe(false);
    expect(params.dateTo).toBeUndefined();
  });

  it('requests past bookings most recent first', async () => {
    mockGet.mockResolvedValue(page([booking('b1')]));
    render(<MyBookingsList tab="past" />);

    await screen.findByText('Bussell');

    const params = mockGet.mock.calls[0][0]!;
    expect(params).toMatchObject({ order: 'DESC', page: 0, size: 10 });
    expect(params.dateTo).toEqual(expect.any(String));
    expect(params.dateFrom).toBeUndefined();
  });

  it('keeps cancelled bookings in the list with a label', async () => {
    mockGet.mockResolvedValue(page([booking('b1', { status: 'CANCELLED' })]));
    render(<MyBookingsList tab="upcoming" />);

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  });

  it('offers Cancel on upcoming bookings and marks a cancelled one in place', async () => {
    mockGet.mockResolvedValue(page([booking('b1'), booking('b2', { room: 'FOSSE' })]));
    jest.mocked(cancelBooking).mockResolvedValue(undefined);
    render(<MyBookingsList tab="upcoming" />);
    await screen.findByText('Bussell');

    const [first] = screen.getAllByRole('button', { name: 'Cancel booking' });
    await userEvent.click(first);
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cancel booking' })).toHaveLength(1);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('offers no Cancel button on past bookings', async () => {
    mockGet.mockResolvedValue(page([booking('b1')]));
    render(<MyBookingsList tab="past" />);
    await screen.findByText('Bussell');

    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('pages forward and back', async () => {
    mockGet.mockResolvedValueOnce(page([booking('b1')], 0, 2));
    render(<MyBookingsList tab="upcoming" />);
    await screen.findByText('Page 1 of 2');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    mockGet.mockResolvedValueOnce(page([booking('b2')], 1, 2));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await screen.findByText('Page 2 of 2');
    expect(mockGet.mock.calls[1][0]).toMatchObject({ page: 1 });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    mockGet.mockResolvedValueOnce(page([booking('b1')], 0, 2));
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await screen.findByText('Page 1 of 2');
    expect(mockGet.mock.calls[2][0]).toMatchObject({ page: 0 });
  });

  it('uses the same "now" on every page of a tab', async () => {
    mockGet.mockResolvedValueOnce(page([booking('b1')], 0, 2));
    render(<MyBookingsList tab="upcoming" />);
    await screen.findByText('Page 1 of 2');
    mockGet.mockResolvedValueOnce(page([booking('b2')], 1, 2));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Page 2 of 2');

    expect(mockGet.mock.calls[1][0]!.dateFrom).toBe(mockGet.mock.calls[0][0]!.dateFrom);
  });

  it('shows the upcoming empty state with a Book a room link', async () => {
    mockGet.mockResolvedValue(page([]));
    render(<MyBookingsList tab="upcoming" />);

    expect(await screen.findByText('No upcoming bookings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a room' })).toHaveAttribute('href', '/calendar');
  });

  it('shows the past empty state without a button', async () => {
    mockGet.mockResolvedValue(page([]));
    render(<MyBookingsList tab="past" />);

    expect(await screen.findByText('No past bookings')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Book a room' })).not.toBeInTheDocument();
  });

  it('shows the error and retries', async () => {
    mockGet.mockRejectedValueOnce(new AxiosError('Network Error'));
    render(<MyBookingsList tab="upcoming" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect');

    mockGet.mockResolvedValueOnce(page([booking('b1')]));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Bussell')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
