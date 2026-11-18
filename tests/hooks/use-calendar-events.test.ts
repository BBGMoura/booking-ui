import { renderHook, waitFor } from '@testing-library/react';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import type { Room } from '@/lib/types/booking';
import { getMyBookingsInRange, getRoomSchedule } from '@/lib/api/booking';

jest.mock('@/lib/api/booking', () => ({
  getRoomSchedule: jest.fn(),
  getMyBookingsInRange: jest.fn(),
}));

const week1 = { start: new Date('2026-11-16T00:00:00Z'), end: new Date('2026-11-23T00:00:00Z') };
const week2 = { start: new Date('2026-11-23T00:00:00Z'), end: new Date('2026-11-30T00:00:00Z') };

const b = (uid: string, room: 'ASTAIRE' | 'FOSSE') => ({
  uid,
  userUid: 'u',
  room,
  status: 'BOOKED' as const,
  shareable: false,
  classType: 'PRIVATE' as const,
  dateFrom: '2026-11-18T10:00:00Z',
  dateTo: '2026-11-18T11:00:00Z',
  totalPrice: 1,
});

beforeEach(() => {
  jest
    .mocked(getRoomSchedule)
    .mockReset()
    .mockResolvedValue([b('x', 'ASTAIRE')]);
  jest
    .mocked(getMyBookingsInRange)
    .mockReset()
    .mockResolvedValue([b('m', 'FOSSE')]);
});

describe('useCalendarEvents', () => {
  it('does not fetch until the visible range is known', () => {
    renderHook(() => useCalendarEvents(null, true, null));
    expect(getMyBookingsInRange).not.toHaveBeenCalled();
  });

  it('fetches only my bookings when no room is selected', async () => {
    const { result } = renderHook(() => useCalendarEvents(null, true, week1));
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(getRoomSchedule).not.toHaveBeenCalled();
    expect(getMyBookingsInRange).toHaveBeenCalledWith(
      week1.start.toISOString(),
      week1.end.toISOString()
    );
  });

  it('fetches the room schedule and renders the busy elsewhere layer', async () => {
    const { result } = renderHook(() => useCalendarEvents('ASTAIRE', true, week1));
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(getRoomSchedule).toHaveBeenCalledWith(
      'ASTAIRE',
      week1.start.toISOString(),
      week1.end.toISOString()
    );
    expect(result.current.events.map((e) => e.id)).toEqual(['x', 'busy-m']);
  });

  it('drops the layer without refetching when the overlay is switched off', async () => {
    const { result, rerender } = renderHook(
      ({ show }) => useCalendarEvents('ASTAIRE', show, week1),
      { initialProps: { show: true } }
    );
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    rerender({ show: false });
    expect(result.current.events.map((e) => e.id)).toEqual(['x']);
    expect(getRoomSchedule).toHaveBeenCalledTimes(1);
  });

  it('refetches when the range or room changes', async () => {
    const { result, rerender } = renderHook(({ r, range }) => useCalendarEvents(r, true, range), {
      initialProps: { r: 'ASTAIRE' as Room, range: week1 },
    });
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    rerender({ r: 'ASTAIRE', range: week2 });
    await waitFor(() => expect(getRoomSchedule).toHaveBeenCalledTimes(2));
    rerender({ r: 'FOSSE', range: week2 });
    await waitFor(() => expect(getRoomSchedule).toHaveBeenCalledTimes(3));
    expect(getRoomSchedule).toHaveBeenLastCalledWith(
      'FOSSE',
      week2.start.toISOString(),
      week2.end.toISOString()
    );
  });

  it('reports an error when a fetch fails', async () => {
    jest.mocked(getMyBookingsInRange).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCalendarEvents(null, true, week1));
    await waitFor(() => expect(result.current.error).toBe('Could not load bookings.'));
  });
});
