import { act, renderHook } from '@testing-library/react';
import { useBookingAvailability } from '@/hooks/use-booking-availability';
import { type BookingCheck, useBookingCheck } from '@/hooks/use-booking-check';
import type { BookingView } from '@/lib/types/booking';
import { NOT_FREE_MESSAGE, SHAREABLE_FULL_MESSAGE } from '@/lib/utils/bookingMessages';

jest.mock('@/hooks/use-booking-check', () => ({ useBookingCheck: jest.fn() }));

// 2026-11-18, 10:00–11:30 local time, with the clock at 08:20.
const date = new Date(2026, 10, 18);
const options = {
  room: 'ASTAIRE' as const,
  date,
  start: 10 * 60,
  end: 11 * 60 + 30,
  classType: 'PRIVATE' as const,
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

const answer = (check: BookingCheck | null) => jest.mocked(useBookingCheck).mockReturnValue(check);
const refused = (code: string): BookingCheck => ({ state: 'refused', code, message: 'backend' });

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 18, 8, 20) });
  answer({ state: 'free' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBookingAvailability', () => {
  it('asks about the booking as it would be sent', () => {
    renderHook(() => useBookingAvailability(options));

    expect(useBookingCheck).toHaveBeenLastCalledWith({
      room: 'ASTAIRE',
      classType: 'PRIVATE',
      isShareable: false,
      dateFrom: expect.stringMatching(/^2026-11-18T10:00:00/),
      dateTo: expect.stringMatching(/^2026-11-18T11:30:00/),
    });
  });

  it.each([
    ['no class type', { classType: undefined }],
    ['no room', { room: undefined }],
    ['no end', { end: null }],
    ['a time that has passed', { start: 7 * 60, end: 8 * 60 }],
    ['a time the backend would reject', { end: 10 * 60 + 10 }],
  ])('asks about nothing with %s', (_, change) => {
    renderHook(() => useBookingAvailability({ ...options, ...change }));

    expect(useBookingCheck).toHaveBeenLastCalledWith(null);
  });

  it.each([
    [{ state: 'free' } as BookingCheck, { tone: 'free', room: 'ASTAIRE' }],
    [{ state: 'checking' } as BookingCheck, { tone: 'checking', room: 'ASTAIRE' }],
    [{ state: 'unknown' } as BookingCheck, null],
    [null, null],
  ])('turns the answer %j into the notice %j', (check, notice) => {
    answer(check);
    const { result } = renderHook(() => useBookingAvailability(options));

    expect(result.current.notice).toEqual(notice);
  });

  it('names the booking in the way when the backend reports a clash', () => {
    answer(refused('BOOKING_CONFLICT'));
    const { result } = renderHook(() =>
      useBookingAvailability({ ...options, schedule: [booked(11, 12)] })
    );

    expect(result.current.notice).toEqual({
      tone: 'warning',
      message: 'Overlaps a booking (11:00–12:00). Choose another time.',
    });
  });

  it('warns in general terms when the schedule doesn’t show the clash', () => {
    answer(refused('BOOKING_CONFLICT'));
    const { result } = renderHook(() => useBookingAvailability({ ...options, schedule: null }));

    expect(result.current.notice).toEqual({ tone: 'warning', message: NOT_FREE_MESSAGE });
  });

  it('suggests sharing when only shareable bookings are in the way', () => {
    answer(refused('BOOKING_CONFLICT'));
    const { result } = renderHook(() =>
      useBookingAvailability({ ...options, schedule: [booked(11, 12, true)] })
    );

    expect(result.current.notice).toMatchObject({ message: /Turn on Shareable/ });
  });

  it('uses the backend’s message for a rule it has no message of its own for', () => {
    answer(refused('BOOKING_TIME_INVALID'));
    const { result } = renderHook(() => useBookingAvailability(options));

    expect(result.current.notice).toEqual({ tone: 'warning', message: 'backend' });
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
