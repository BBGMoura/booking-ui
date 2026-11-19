import { act, renderHook } from '@testing-library/react';
import { useBookingDetails } from '@/hooks/use-booking-details';
import type { BookingDetails } from '@/lib/utils/calendarEvents';

const details: BookingDetails = {
  uid: 'b1',
  start: '2026-11-20T10:00:00Z',
  end: '2026-11-20T11:00:00Z',
  classType: 'PRIVATE',
  shareable: false,
  cancellable: true,
};

describe('useBookingDetails', () => {
  it('opens the clicked booking next to its tile, and closes it', () => {
    const anchor = document.createElement('div');
    const { result } = renderHook(() => useBookingDetails());
    expect(result.current.selected).toBeNull();

    act(() => result.current.open(details, anchor));
    expect(result.current.selected).toEqual({ details, anchor });

    act(() => result.current.close());
    expect(result.current.selected).toBeNull();
  });
});
