import { act, renderHook, waitFor } from '@testing-library/react';
import { POLL_INTERVAL_MS, useCalendarEvents, type DateRange } from '@/hooks/use-calendar-events';
import type { BookingView, Room } from '@/lib/types/booking';
import { getMyBookingsInRange, getRoomSchedule } from '@/lib/api/booking';

jest.mock('@/lib/api/booking', () => ({
  getRoomSchedule: jest.fn(),
  getMyBookingsInRange: jest.fn(),
}));

// Local midnights, as FullCalendar reports them. 16 November 2026 is a Monday.
const day = (date: number) => new Date(2026, 10, date);
const week1 = { start: day(16), end: day(23) };
const week2 = { start: day(23), end: day(30) };
const week3 = { start: day(30), end: day(37) };
const tuesday = { start: day(17), end: day(18) };
const wednesday = { start: day(18), end: day(19) };
// Three days that cross from week 1 into week 2.
const satToMon = { start: day(21), end: day(24) };

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

  it('prefetches the next week once the visible one has loaded', async () => {
    renderHook(() => useCalendarEvents('ASTAIRE', true, week1, teacher));
    await waitFor(() => expect(roomRequestsFor(week2)).toHaveLength(4));
    expect(getMyBookingsInRange).toHaveBeenCalledWith(
      week2.start.toISOString(),
      week2.end.toISOString()
    );
  });

  it('shows a prefetched or visited week straight away and refreshes it in the background', async () => {
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

  it('drops a cancelled booking from the events straight away', async () => {
    const { result } = renderHook(() => useCalendarEvents('FOSSE', true, week1, teacher));
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toContain('FOSSE-booking'));

    act(() => result.current.removeBooking('FOSSE-booking'));

    expect(result.current.events.map((e) => e.id)).not.toContain('FOSSE-booking');
  });

  it('exposes every room’s bookings for the visible range once loaded', async () => {
    const { result } = renderHook(() => useCalendarEvents('ASTAIRE', false, week1, teacher));
    expect(result.current.schedules).toBeNull();

    await waitFor(() => expect(result.current.schedules).not.toBeNull());
    expect(result.current.schedules!.FOSSE).toEqual([b('FOSSE-booking', 'FOSSE')]);
  });

  it('refresh refetches the visible range and shows the new data', async () => {
    const { result } = renderHook(() => useCalendarEvents('ASTAIRE', false, week1, teacher));
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    jest
      .mocked(getRoomSchedule)
      .mockImplementation(async (room) => [b(`${room}-1`, room), b(`${room}-2`, room)]);
    await act(() => result.current.refresh());

    expect(result.current.events).toHaveLength(2);
  });

  it('loads the whole week for a single day', async () => {
    const { result } = renderHook(() => useCalendarEvents('ASTAIRE', false, tuesday, teacher));
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(roomRequestsFor(week1)).toHaveLength(4);
    expect(getMyBookingsInRange).toHaveBeenCalledWith(
      week1.start.toISOString(),
      week1.end.toISOString()
    );
    expect(roomRequestsFor(tuesday)).toHaveLength(0);
  });

  it('moves between days in a loaded week without loading or fetching again', async () => {
    const { result, rerender } = renderHook(
      ({ range }) => useCalendarEvents('ASTAIRE', false, range, teacher),
      { initialProps: { range: tuesday } }
    );
    await waitFor(() => expect(roomRequestsFor(week2)).toHaveLength(4));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const requests = jest.mocked(getRoomSchedule).mock.calls.length;

    rerender({ range: wednesday });
    expect(result.current.loading).toBe(false);
    expect(result.current.events.map((e) => e.id)).toEqual(['ASTAIRE-booking']);

    rerender({ range: week1 });
    expect(result.current.loading).toBe(false);
    expect(jest.mocked(getRoomSchedule).mock.calls).toHaveLength(requests);
  });

  it('loads both weeks for a range that crosses into the next week', async () => {
    jest
      .mocked(getRoomSchedule)
      .mockImplementation(async (room, from) => [
        b(`${room}-${from === week1.start.toISOString() ? 'week1' : 'week2'}`, room),
      ]);
    const { result } = renderHook(() => useCalendarEvents('ASTAIRE', false, satToMon, teacher));
    expect(result.current.loading).toBe(true);
    await waitFor(() =>
      expect(result.current.events.map((e) => e.id)).toEqual(['ASTAIRE-week1', 'ASTAIRE-week2'])
    );
    // The prefetch follows the last of the weeks on screen.
    await waitFor(() => expect(roomRequestsFor(week3)).toHaveLength(4));
  });

  it('refresh refetches every week on screen', async () => {
    const { result } = renderHook(() => useCalendarEvents('ASTAIRE', false, satToMon, teacher));
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    const week1Requests = roomRequestsFor(week1).length;
    const week2Requests = roomRequestsFor(week2).length;

    await act(() => result.current.refresh());

    expect(roomRequestsFor(week1)).toHaveLength(week1Requests + 4);
    expect(roomRequestsFor(week2)).toHaveLength(week2Requests + 4);
  });

  it('refresh reports an error if the refetch fails', async () => {
    const { result } = renderHook(() => useCalendarEvents('ASTAIRE', false, week1, teacher));
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    jest.mocked(getRoomSchedule).mockRejectedValue(new Error('boom'));
    await act(() => result.current.refresh());

    expect(result.current.error).toBe('Could not load bookings.');
  });

  describe('refreshing in the background', () => {
    const setVisibility = (state: 'visible' | 'hidden') =>
      jest.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);

    beforeEach(() =>
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
    );
    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    async function loadWeek() {
      const hook = renderHook(() => useCalendarEvents('ASTAIRE', false, week1, teacher));
      await waitFor(() => expect(hook.result.current.events).toHaveLength(1));
      await act(async () => {}); // let the prefetch finish
      return hook;
    }

    const visibleRequests = () => roomRequestsFor(week1).length;

    it('polls the whole visible week and swaps the new data in without a loading state', async () => {
      const { result } = await loadWeek();
      const before = visibleRequests();
      jest
        .mocked(getRoomSchedule)
        .mockImplementation(async (room) => [b(`${room}-1`, room), b(`${room}-2`, room)]);

      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

      expect(visibleRequests() - before).toBe(4);
      expect(getMyBookingsInRange).toHaveBeenLastCalledWith(
        week1.start.toISOString(),
        week1.end.toISOString()
      );
      expect(result.current.events).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });

    it('keeps polling on every interval', async () => {
      await loadWeek();
      const before = visibleRequests();

      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3));

      expect(visibleRequests() - before).toBe(12);
    });

    it('in the day view, polls the whole week and keeps the same timer across days', async () => {
      const { result, rerender } = renderHook(
        ({ range }) => useCalendarEvents('ASTAIRE', false, range, teacher),
        { initialProps: { range: tuesday } }
      );
      await waitFor(() => expect(result.current.events).toHaveLength(1));
      await act(async () => {});
      const before = visibleRequests();

      // Moving to another day in the same week partway through doesn't restart the interval.
      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS / 2));
      rerender({ range: wednesday });
      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS / 2));

      expect(visibleRequests() - before).toBe(4);
      expect(roomRequestsFor(wednesday)).toHaveLength(0);
    });

    it('does not poll while the tab is hidden', async () => {
      await loadWeek();
      const before = visibleRequests();
      setVisibility('hidden');

      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3));

      expect(visibleRequests()).toBe(before);
    });

    it('refreshes when the tab becomes visible or regains focus', async () => {
      await loadWeek();
      const before = visibleRequests();
      setVisibility('visible');

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(visibleRequests() - before).toBe(4);

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(visibleRequests() - before).toBe(8);
    });

    it('does not refresh on visibilitychange when the tab is hidden', async () => {
      await loadWeek();
      const before = visibleRequests();
      setVisibility('hidden');

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(visibleRequests()).toBe(before);
    });
  });
});
