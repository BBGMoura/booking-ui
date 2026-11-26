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
  forStudio: false,
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
      ['Alex Moore', 'Group class'],
    ]);
  });

  it('shows Studio on studio bookings and marks their details', () => {
    const closed = booking('c', 'ASTAIRE', {
      forStudio: true,
      userUid: null,
      firstName: null,
      lastName: null,
      classType: 'UNAVAILABLE',
    });
    for (const options of [admin, teacher]) {
      const [event] = buildCalendarEvents('ASTAIRE', false, [closed], [], options);
      expect([props(event).heading, props(event).detail]).toEqual(['Closed', 'Studio']);
      expect(props(event).details?.forStudio).toBe(true);
    }
    const [adminEvent] = buildCalendarEvents('ASTAIRE', false, [closed], [], admin);
    expect(props(adminEvent).details?.bookerName).toBe('Studio');
  });

  it('with a room shows class type, then my name on my own bookings only', () => {
    const schedule = [booking('a', 'ASTAIRE'), booking('x', 'ASTAIRE')];
    const events = buildCalendarEvents('ASTAIRE', false, schedule, [booking('a', 'ASTAIRE')], {
      showBooker: false,
      viewerName: 'Tess Teacher',
    });
    expect(events.map((e) => [e.id, props(e).mine, props(e).heading, props(e).detail])).toEqual([
      ['a', true, 'Private', 'Tess Teacher'],
      ['x', false, 'Private', undefined],
    ]);
    expect(events.map((e) => e.title)).toEqual(['Private · Tess Teacher · yours', 'Private']);
  });

  it("doesn't show teachers who made other people's bookings", () => {
    const other = booking('x', 'ASTAIRE', { firstName: 'Jane', lastName: 'Smith' });
    const [event] = buildCalendarEvents('ASTAIRE', false, [other], [], teacher);
    expect(props(event).heading).toBe('Private');
    expect(props(event).detail).toBeUndefined();
    expect(event.title).toBe('Private');
  });

  it('shows admins the class type, then who made each booking', () => {
    const other = booking('x', 'ASTAIRE', { firstName: 'Jane', lastName: 'Smith' });
    const [event] = buildCalendarEvents('ASTAIRE', false, [other], [], admin);
    expect([props(event).heading, props(event).detail]).toEqual(['Private', 'Jane Smith']);
    expect(event.title).toBe('Private · Jane Smith');
  });

  it('falls back when the booker has no name', () => {
    const other = booking('x', 'ASTAIRE', { firstName: null, lastName: null });
    const [event] = buildCalendarEvents('ASTAIRE', false, [other], [], admin);
    expect(props(event).detail).toBe('No name');
    expect(props(event).details?.bookerName).toBeUndefined();
  });

  it("shows the viewer's own name on their bookings, falling back when they have none", () => {
    const own = booking('a', 'ASTAIRE');
    const named = buildCalendarEvents('ASTAIRE', false, [own], [own], {
      showBooker: true,
      viewerName: 'Ada Admin',
    });
    expect(props(named[0]).detail).toBe('Ada Admin');
    const unnamed = buildCalendarEvents('ASTAIRE', false, [own], [own], teacher);
    expect(props(unnamed[0]).detail).toBe('No name');
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
    expect(props(event).heading).toBe('Group class');
  });

  it('adds my bookings in other rooms as busy elsewhere when the overlay is on', () => {
    const mine = [booking('a', 'ASTAIRE'), booking('b', 'FOSSE', { shareable: true })];
    const events = buildCalendarEvents('ASTAIRE', true, [booking('a', 'ASTAIRE')], mine, teacher);
    expect(events.map((e) => e.id)).toEqual(['a', 'busy-b']);
    expect(props(events[1])).toEqual({
      heading: 'Busy · Fosse',
      details: expect.objectContaining({ uid: 'b', room: 'FOSSE', price: 20, cancellable: true }),
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

  describe('details', () => {
    const summary = (uid: string) =>
      ({
        uid,
        room: 'ASTAIRE',
        classType: 'GROUP',
        status: 'BOOKED',
        shareable: true,
        bookedFrom: '2026-11-18T12:00:00Z',
        bookedTo: '2026-11-18T13:00:00Z',
      }) as unknown as BookingView;

    it('gives admins everything, and lets them cancel any booking', () => {
      const [event] = buildCalendarEvents(
        'ASTAIRE',
        false,
        [
          booking('x', 'ASTAIRE', {
            firstName: 'Jane',
            lastName: 'Smith',
          }),
        ],
        [],
        admin
      );
      expect(props(event).details).toEqual({
        uid: 'x',
        start: '2026-11-18T10:00:00Z',
        end: '2026-11-18T11:00:00Z',
        classType: 'PRIVATE',
        shareable: false,
        room: 'ASTAIRE',
        status: 'BOOKED',
        price: 20,
        bookerName: 'Jane Smith',
        cancellable: true,
      });
    });

    it("gives teachers their own booking's room and price, taken from their own list", () => {
      const own = booking('a', 'ASTAIRE', { totalPrice: 35 });
      const [event] = buildCalendarEvents('ASTAIRE', false, [summary('a')], [own], teacher);
      expect(props(event).details).toEqual({
        uid: 'a',
        start: '2026-11-18T12:00:00Z',
        end: '2026-11-18T13:00:00Z',
        classType: 'GROUP',
        shareable: true,
        room: 'ASTAIRE',
        price: 35,
        cancellable: true,
      });
    });

    it("gives teachers only time, class type and shareable for someone else's booking", () => {
      const [event] = buildCalendarEvents('ASTAIRE', false, [summary('x')], [], teacher);
      expect(props(event).details).toEqual({
        uid: 'x',
        start: '2026-11-18T12:00:00Z',
        end: '2026-11-18T13:00:00Z',
        classType: 'GROUP',
        shareable: true,
        cancellable: false,
      });
    });
  });
});
