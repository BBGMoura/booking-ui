import { act, renderHook } from '@testing-library/react';
import { useBookingAvailability } from '@/hooks/use-booking-availability';
import type { BookingView } from '@/lib/types/booking';
import { NOT_FREE_MESSAGE, SHAREABLE_FULL_MESSAGE } from '@/lib/utils/bookingMessages';

// 2026-11-18, 10:00–11:30 local time.
const options = {
  room: 'ASTAIRE' as const,
  date: new Date(2026, 10, 18),
  start: 10 * 60,
  end: 11 * 60 + 30,
  isShareable: false,
  schedule: [] as BookingView[] | null,
  choiceKey: 'a',
};

function booked(fromHour: number, toHour: number, shareable = false): BookingView {
  return {
    uid: `${fromHour}-${shareable}`,
    status: 'BOOKED',
    shareable,
    bookedFrom: new Date(2026, 10, 18, fromHour).toISOString(),
    bookedTo: new Date(2026, 10, 18, toHour).toISOString(),
  } as unknown as BookingView;
}

describe('useBookingAvailability', () => {
  it('says the room is free when nothing in the schedule clashes', () => {
    const { result } = renderHook(() =>
      useBookingAvailability({ ...options, schedule: [booked(12, 13)] })
    );

    expect(result.current.notice).toEqual({ tone: 'free', room: 'ASTAIRE' });
  });

  it.each([
    ['the schedule is loading', { schedule: null }],
    ['there is no room', { room: undefined }],
    ['there is no end time', { end: null }],
  ])('says nothing while %s', (_, change) => {
    const { result } = renderHook(() => useBookingAvailability({ ...options, ...change }));

    expect(result.current.notice).toBeNull();
  });

  it('warns about a booking in the way', () => {
    const { result } = renderHook(() =>
      useBookingAvailability({ ...options, schedule: [booked(11, 12)] })
    );

    expect(result.current.notice).toEqual({
      tone: 'warning',
      message: 'Overlaps a booking (11:00–12:00). Choose another time.',
    });
  });

  it('suggests sharing when only shareable bookings are in the way', () => {
    const { result } = renderHook(() =>
      useBookingAvailability({ ...options, schedule: [booked(11, 12, true)] })
    );

    expect(result.current.notice).toMatchObject({ message: /Turn on Shareable/ });
  });

  it('shows a refused booking as an error until the choices change', () => {
    const { result, rerender } = renderHook((props) => useBookingAvailability(props), {
      initialProps: options,
    });

    act(() => result.current.reject('BOOKING_SHAREABLE_LIMIT'));
    expect(result.current.notice).toEqual({ tone: 'error', message: SHAREABLE_FULL_MESSAGE });

    rerender({ ...options, choiceKey: 'b' });
    expect(result.current.notice).toEqual({ tone: 'free', room: 'ASTAIRE' });
  });

  it('names what’s in the way of a refused booking once the schedule shows it', () => {
    const { result, rerender } = renderHook((props) => useBookingAvailability(props), {
      initialProps: options,
    });
    act(() => result.current.reject('BOOKING_CONFLICT'));
    expect(result.current.notice).toEqual({ tone: 'error', message: NOT_FREE_MESSAGE });

    rerender({ ...options, schedule: [booked(11, 12)] });

    expect(result.current.notice).toEqual({
      tone: 'error',
      message: 'Overlaps a booking (11:00–12:00). Choose another time.',
    });
  });
});
