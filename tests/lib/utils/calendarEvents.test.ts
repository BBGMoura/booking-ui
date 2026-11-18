import { buildCalendarEvents } from '@/lib/utils/calendarEvents';
import type { BookingView } from '@/lib/types/booking';

const booking = (uid: string, room: BookingView['room'], over: Partial<BookingView> = {}) => ({
  uid,
  userUid: 'u1',
  room,
  status: 'BOOKED' as const,
  shareable: false,
  classType: 'PRIVATE' as const,
  dateFrom: '2026-11-18T10:00:00Z',
  dateTo: '2026-11-18T11:00:00Z',
  totalPrice: 20,
  ...over,
});

describe('buildCalendarEvents', () => {
  it('with no room shows only my bookings across rooms', () => {
    const mine = [booking('a', 'ASTAIRE'), booking('b', 'FOSSE')];
    const events = buildCalendarEvents(null, true, [], mine);
    expect(events.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('with a room distinguishes my bookings from others by uid', () => {
    const schedule = [booking('a', 'ASTAIRE'), booking('x', 'ASTAIRE')];
    const events = buildCalendarEvents('ASTAIRE', false, schedule, [booking('a', 'ASTAIRE')]);
    expect(events.map((e) => [e.id, e.extendedProps?.mine])).toEqual([
      ['a', true],
      ['x', false],
    ]);
  });

  it('reads the summary shape returned to regular users', () => {
    const summary = {
      uid: 'x',
      room: 'ASTAIRE',
      status: 'BOOKED',
      classType: 'GROUP',
      shareable: true,
      bookedFrom: '2026-11-18T12:00:00Z',
      bookedTo: '2026-11-18T13:00:00Z',
    } as unknown as BookingView;
    const [event] = buildCalendarEvents('ASTAIRE', false, [summary], []);
    expect(event.start).toBe('2026-11-18T12:00:00Z');
    expect(event.end).toBe('2026-11-18T13:00:00Z');
  });

  it('adds my bookings in other rooms as busy elsewhere when the overlay is on', () => {
    const mine = [booking('a', 'ASTAIRE'), booking('b', 'FOSSE')];
    const events = buildCalendarEvents('ASTAIRE', true, [booking('a', 'ASTAIRE')], mine);
    expect(events.map((e) => e.id)).toEqual(['a', 'busy-b']);
    expect(events[1].extendedProps?.busyElsewhere).toBe(true);
  });

  it('omits the busy elsewhere layer when the overlay is off', () => {
    const mine = [booking('b', 'FOSSE')];
    expect(buildCalendarEvents('ASTAIRE', false, [], mine)).toEqual([]);
  });

  it('does not render a booking twice when it is in the room schedule', () => {
    const mine = [booking('a', 'ASTAIRE')];
    const events = buildCalendarEvents('ASTAIRE', true, [booking('a', 'ASTAIRE')], mine);
    expect(events).toHaveLength(1);
  });

  it('hides cancelled bookings', () => {
    const cancelled = booking('c', 'ASTAIRE', { status: 'CANCELLED' });
    expect(buildCalendarEvents('ASTAIRE', true, [cancelled], [cancelled])).toEqual([]);
    expect(buildCalendarEvents(null, true, [], [cancelled])).toEqual([]);
  });
});
