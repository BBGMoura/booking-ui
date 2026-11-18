import { renderHook, waitFor } from '@testing-library/react';
import { useCalendarEvents, type DateRange } from '@/hooks/use-calendar-events';
import type { BookingView, Room } from '@/lib/types/booking';
import { getMyBookingsInRange, getRoomSchedule } from '@/lib/api/booking';

jest.mock('@/lib/api/booking', () => ({
  getRoomSchedule: jest.fn(),
  getMyBookingsInRange: jest.fn(),
}));

const week1 = { start: new Date('2026-11-16T00:00:00Z'), end: new Date('2026-11-23T00:00:00Z') };
const week2 = { start: new Date('2026-11-23T00:00:00Z'), end: new Date('2026-11-30T00:00:00Z') };
const week3 = { start: new Date('2026-11-30T00:00:00Z'), end: new Date('2026-12-07T00:00:00Z') };

const b = (uid: string, room: Room): BookingView => ({
  uid,
  userUid: 'u',
  room,
  status: 'BOOKED',
  shareable: false,
  classType: 'PRIVATE',
  dateFrom: '2026-11-18T10:00:00Z',
  dateTo: '2026-11-18T11:00:00Z',
  totalPrice: 1,
});

const teacher = { showBooker: false };

/** Requests made for a range, out of everything fetched so far. */
const roomRequestsFor = (range: DateRange) =>
  jest.mocked(getRoomSchedule).mock.calls.filter(([, from]) => from === range.start.toISOString());

beforeEach(() => {
  jest
    .mocked(getRoomSchedule)
    .mockReset()
    .mockImplementation(async (room) => [b(`${room}-booking`, room)]);
  jest
    .mocked(getMyBookingsInRange)
    .mockReset()
    .mockResolvedValue([b('m', 'FOSSE')]);
});

describe('useCalendarEvents', () => {
  it('does not fetch until the visible range is known', () => {
    renderHook(() => useCalendarEvents(null, true, null, teacher));
    expect(getMyBookingsInRange).not.toHaveBeenCalled();
    expect(getRoomSchedule).not.toHaveBeenCalled();
  });

  it('loads every room and my bookings for the visible range in one go', async () => {
    const { result } = renderHook(() => useCalendarEvents(null, true, week1, teacher));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.loading).toBe(false);
    expect(roomRequestsFor(week1).map(([room]) => room)).toEqual([
      'ASTAIRE',
      'BUSSELL',
      'ALEX_MOORE',
      'FOSSE',
    ]);
    expect(getMyBookingsInRange).toHaveBeenCalledWith(
      week1.start.toISOString(),
      week1.end.toISOString()
    );
  });

  it('switches rooms instantly, without another request', async () => {
    const { result, rerender } = renderHook(
      ({ room }) => useCalendarEvents(room, true, week1, teacher),
      { initialProps: { room: 'ASTAIRE' as Room | null } }
    );
    await waitFor(() =>
      expect(result.current.events.map((e) => e.id)).toContain('ASTAIRE-booking')
    );
    const requests = roomRequestsFor(week1).length;

    rerender({ room: 'BUSSELL' });
    expect(result.current.loading).toBe(false);
    expect(result.current.events.map((e) => e.id)).toEqual(['BUSSELL-booking', 'busy-m']);
    expect(roomRequestsFor(week1)).toHaveLength(requests);
  });

  it('drops the busy elsewhere layer without refetching when the overlay is switched off', async () => {
    const { result, rerender } = renderHook(
      ({ show }) => useCalendarEvents('ASTAIRE', show, week1, teacher),
      { initialProps: { show: true } }
    );
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    const requests = jest.mocked(getMyBookingsInRange).mock.calls.length;
    rerender({ show: false });
    expect(result.current.events.map((e) => e.id)).toEqual(['ASTAIRE-booking']);
    expect(getMyBookingsInRange).toHaveBeenCalledTimes(requests);
  });

  it('prefetches the next range once the visible one has loaded', async () => {
    renderHook(() => useCalendarEvents('ASTAIRE', true, week1, teacher));
    await waitFor(() => expect(roomRequestsFor(week2)).toHaveLength(4));
    expect(getMyBookingsInRange).toHaveBeenCalledWith(
      week2.start.toISOString(),
      week2.end.toISOString()
    );
  });

  it('shows a prefetched or visited range straight away and refreshes it in the background', async () => {
    const { result, rerender } = renderHook(
      ({ range }) => useCalendarEvents('ASTAIRE', true, range, teacher),
      { initialProps: { range: week1 } }
    );
    await waitFor(() => expect(roomRequestsFor(week2)).toHaveLength(4));
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ range: week2 });
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0));
    expect(result.current.loading).toBe(false);

    rerender({ range: week1 });
    expect(result.current.loading).toBe(false);
    expect(result.current.events.map((e) => e.id)).toContain('ASTAIRE-booking');
    await waitFor(() => expect(roomRequestsFor(week1)).toHaveLength(8));
    // Going to week 2 prefetched week 3.
    await waitFor(() => expect(roomRequestsFor(week3)).toHaveLength(4));
  });

  it('reports an error when the visible range fails to load', async () => {
    jest.mocked(getMyBookingsInRange).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCalendarEvents(null, true, week1, teacher));
    await waitFor(() => expect(result.current.error).toBe('Could not load bookings.'));
    expect(result.current.loading).toBe(false);
  });

  it('passes the booker option through so admins see names', async () => {
    jest
      .mocked(getRoomSchedule)
      .mockResolvedValue([{ ...b('x', 'ASTAIRE'), firstName: 'Jane', lastName: 'Smith' }]);
    const { result } = renderHook(() =>
      useCalendarEvents('ASTAIRE', false, week1, { showBooker: true })
    );
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.events[0].title).toBe('Private · Jane Smith');
  });
});
