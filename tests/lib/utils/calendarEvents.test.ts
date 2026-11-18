import { buildCalendarEvents, type BookingEventProps } from '@/lib/utils/calendarEvents';
import type { BookingView } from '@/lib/types/booking';
import type { EventInput } from '@fullcalendar/react';

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

const teacher = { showBooker: false };
const admin = { showBooker: true };

const props = (e: EventInput) => e.extendedProps as BookingEventProps;

describe('buildCalendarEvents', () => {
  it('with no room shows only my bookings across rooms, headed by room', () => {
    const mine = [booking('a', 'ASTAIRE'), booking('b', 'ALEX_MOORE', { classType: 'GROUP' })];
    const events = buildCalendarEvents(null, true, [], mine, teacher);
    expect(events.map((e) => e.id)).toEqual(['a', 'b']);
    expect(events.map((e) => [props(e).heading, props(e).detail])).toEqual([
      ['Astaire', 'Private'],
      ['Alex Moore', 'Group'],
    ]);
  });

  it('with a room distinguishes my bookings from others by uid', () => {
    const schedule = [booking('a', 'ASTAIRE'), booking('x', 'ASTAIRE')];
    const events = buildCalendarEvents(
      'ASTAIRE',
      false,
      schedule,
      [booking('a', 'ASTAIRE')],
      teacher
    );
    expect(events.map((e) => [e.id, props(e).mine, props(e).heading])).toEqual([
      ['a', true, 'Private'],
      ['x', false, 'Private'],
    ]);
    expect(events.map((e) => e.title)).toEqual(['Private · yours', 'Private']);
  });

  it("doesn't show teachers who made other people's bookings", () => {
    const other = booking('x', 'ASTAIRE', { firstName: 'Jane', lastName: 'Smith' });
    const [event] = buildCalendarEvents('ASTAIRE', false, [other], [], teacher);
    expect(props(event).heading).toBe('Private');
    expect(props(event).detail).toBeUndefined();
    expect(event.title).toBe('Private');
  });

  it('shows admins who made each booking, then the class type', () => {
    const other = booking('x', 'ASTAIRE', { firstName: 'Jane', lastName: 'Smith' });
    const [event] = buildCalendarEvents('ASTAIRE', false, [other], [], admin);
    expect([props(event).heading, props(event).detail]).toEqual(['Jane Smith', 'Private']);
    expect(event.title).toBe('Jane Smith · Private');
  });

  it('falls back when the booker has no name', () => {
    const other = booking('x', 'ASTAIRE', { firstName: null, lastName: null });
    const [event] = buildCalendarEvents('ASTAIRE', false, [other], [], admin);
    expect(props(event).heading).toBe('No name');
  });

  it("lays out an admin's own booking like everyone else's, by name", () => {
    const own = booking('a', 'ASTAIRE', { firstName: 'Ada', lastName: 'Admin' });
    const [event] = buildCalendarEvents('ASTAIRE', false, [own], [own], admin);
    expect([props(event).heading, props(event).detail, props(event).mine]).toEqual([
      'Ada Admin',
      'Private',
      true,
    ]);
  });

  it('marks shareable bookings', () => {
    const schedule = [booking('s', 'ASTAIRE', { shareable: true }), booking('n', 'ASTAIRE')];
    const events = buildCalendarEvents('ASTAIRE', false, schedule, [], teacher);
    expect(events.map((e) => props(e).shareable)).toEqual([true, false]);
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
    const [event] = buildCalendarEvents('ASTAIRE', false, [summary], [], teacher);
    expect(event.start).toBe('2026-11-18T12:00:00Z');
    expect(event.end).toBe('2026-11-18T13:00:00Z');
    expect(props(event).heading).toBe('Group');
  });

  it('adds my bookings in other rooms as busy elsewhere when the overlay is on', () => {
    const mine = [booking('a', 'ASTAIRE'), booking('b', 'FOSSE', { shareable: true })];
    const events = buildCalendarEvents('ASTAIRE', true, [booking('a', 'ASTAIRE')], mine, teacher);
    expect(events.map((e) => e.id)).toEqual(['a', 'busy-b']);
    expect(props(events[1])).toEqual({
      heading: 'Busy · Fosse',
      detail: 'Private',
      shareable: true,
      mine: true,
      busyElsewhere: true,
    });
  });

  it('omits the busy elsewhere layer when the overlay is off', () => {
    const mine = [booking('b', 'FOSSE')];
    expect(buildCalendarEvents('ASTAIRE', false, [], mine, teacher)).toEqual([]);
  });

  it('does not render a booking twice when it is in the room schedule', () => {
    const mine = [booking('a', 'ASTAIRE')];
    const events = buildCalendarEvents('ASTAIRE', true, [booking('a', 'ASTAIRE')], mine, teacher);
    expect(events).toHaveLength(1);
  });

  it('hides cancelled bookings', () => {
    const cancelled = booking('c', 'ASTAIRE', { status: 'CANCELLED' });
    expect(buildCalendarEvents('ASTAIRE', true, [cancelled], [cancelled], teacher)).toEqual([]);
    expect(buildCalendarEvents(null, true, [], [cancelled], teacher)).toEqual([]);
  });
});
