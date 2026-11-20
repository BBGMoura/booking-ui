import { act, renderHook } from '@testing-library/react';
import { AxiosError } from 'axios';
import { BOOKING_CHECK_DELAY_MS, useBookingCheck } from '@/hooks/use-booking-check';
import { validateBooking } from '@/lib/api/booking';
import type { CreateBookingData } from '@/lib/types/booking';

jest.mock('@/lib/api/booking', () => ({ validateBooking: jest.fn() }));

const booking: CreateBookingData = {
  room: 'ASTAIRE',
  classType: 'PRIVATE',
  isShareable: false,
  dateFrom: '2026-11-18T10:00:00Z',
  dateTo: '2026-11-18T11:00:00Z',
};
const later: CreateBookingData = {
  ...booking,
  dateFrom: '2026-11-18T12:00:00Z',
  dateTo: '2026-11-18T13:00:00Z',
};

function backendError(status: number, error: string) {
  return new AxiosError('fail', String(status), undefined, undefined, {
    status,
    data: { status, error, message: 'backend message' },
  } as never);
}

const waitOutDelay = () =>
  act(async () => {
    jest.advanceTimersByTime(BOOKING_CHECK_DELAY_MS);
  });

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(validateBooking).mockReset().mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBookingCheck', () => {
  it('has nothing to say without a booking', () => {
    const { result } = renderHook(() => useBookingCheck(null));

    expect(result.current).toBeNull();
    expect(validateBooking).not.toHaveBeenCalled();
  });

  it('is checking until the delay passes and the backend answers, then says free', async () => {
    const { result } = renderHook(() => useBookingCheck(booking));
    expect(result.current).toEqual({ state: 'checking' });

    await waitOutDelay();

    expect(validateBooking).toHaveBeenCalledWith(booking);
    expect(result.current).toEqual({ state: 'free' });
  });

  it('only asks about the last booking when it changes within the delay', async () => {
    const { rerender } = renderHook(({ b }) => useBookingCheck(b), {
      initialProps: { b: booking },
    });
    act(() => jest.advanceTimersByTime(BOOKING_CHECK_DELAY_MS / 2));
    rerender({ b: later });

    await waitOutDelay();

    expect(validateBooking).toHaveBeenCalledTimes(1);
    expect(validateBooking).toHaveBeenCalledWith(later);
  });

  it('doesn’t ask again for the same booking in a new object', async () => {
    const { rerender } = renderHook(({ b }) => useBookingCheck(b), {
      initialProps: { b: booking },
    });
    await waitOutDelay();
    rerender({ b: { ...booking } });
    await waitOutDelay();

    expect(validateBooking).toHaveBeenCalledTimes(1);
  });

  it('reports the code and message of a 400', async () => {
    jest.mocked(validateBooking).mockRejectedValue(backendError(400, 'BOOKING_CONFLICT'));
    const { result } = renderHook(() => useBookingCheck(booking));

    await waitOutDelay();

    expect(result.current).toEqual({
      state: 'refused',
      code: 'BOOKING_CONFLICT',
      message: 'backend message',
    });
  });

  it('is unknown when the check itself fails', async () => {
    jest.mocked(validateBooking).mockRejectedValue(backendError(500, 'SOMETHING_ELSE'));
    const { result } = renderHook(() => useBookingCheck(booking));

    await waitOutDelay();

    expect(result.current).toEqual({ state: 'unknown' });
  });

  it('never shows an answer about an earlier booking', async () => {
    let answerFirst: () => void = () => {};
    jest
      .mocked(validateBooking)
      .mockReturnValueOnce(new Promise<void>((resolve) => (answerFirst = resolve)))
      .mockReturnValueOnce(new Promise<void>(() => {}));
    const { result, rerender } = renderHook(({ b }) => useBookingCheck(b), {
      initialProps: { b: booking },
    });
    await waitOutDelay();
    rerender({ b: later });
    await waitOutDelay();

    await act(async () => answerFirst());

    expect(result.current).toEqual({ state: 'checking' });
  });
});
