import type { BookingView } from '@/lib/types/booking';
import { findConflict } from '@/lib/utils/bookingConflicts';

// 2026-11-18, hours and minutes in local time.
const at = (hours: number, minutes = 0) => new Date(2026, 10, 18, hours, minutes);

function booking(from: Date, to: Date, shareable = false, status = 'BOOKED'): BookingView {
  return {
    uid: `${from.getTime()}-${to.getTime()}-${shareable}`,
    room: 'ASTAIRE',
    classType: 'GROUP',
    status,
    shareable,
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
  } as BookingView;
}

const request = (start: Date, end: Date, isShareable = false) => ({ start, end, isShareable });

describe('findConflict', () => {
  it('finds nothing in an empty room', () => {
    expect(findConflict([], request(at(10), at(11)))).toBeNull();
  });

  it('allows bookings that only touch end to start', () => {
    const schedule = [booking(at(9), at(10)), booking(at(11), at(12))];
    expect(findConflict(schedule, request(at(10), at(11)))).toBeNull();
  });

  it('rejects any overlap with a booking that is not shareable', () => {
    const existing = booking(at(10, 30), at(11, 30));
    expect(findConflict([existing], request(at(10), at(11), true))).toEqual({
      code: 'BOOKING_CONFLICT',
      bookings: [existing],
    });
  });

  it('rejects a booking that is not shareable over a shareable one', () => {
    const existing = booking(at(10), at(11), true);
    expect(findConflict([existing], request(at(10), at(11)))?.code).toBe('BOOKING_CONFLICT');
  });

  it('lets shareable bookings overlap up to the limit', () => {
    const schedule = [booking(at(10), at(11), true), booking(at(10, 30), at(12), true)];
    expect(findConflict(schedule, request(at(10), at(11), true))).toBeNull();
  });

  it('rejects a shareable booking once 3 shareable bookings overlap at any moment', () => {
    const schedule = [
      booking(at(9), at(10, 5), true),
      booking(at(10), at(11), true),
      booking(at(10), at(10, 5), true),
    ];
    expect(findConflict(schedule, request(at(10), at(11), true))?.code).toBe(
      'BOOKING_SHAREABLE_LIMIT'
    );
    expect(findConflict(schedule, request(at(10, 5), at(11), true))).toBeNull();
  });

  it('reads the schedule summary shape and ignores cancelled bookings', () => {
    const summary = {
      ...booking(at(10), at(11)),
      dateFrom: undefined,
      dateTo: undefined,
      bookedFrom: at(10).toISOString(),
      bookedTo: at(11).toISOString(),
    } as unknown as BookingView;
    expect(findConflict([summary], request(at(10), at(11)))?.code).toBe('BOOKING_CONFLICT');
    expect(
      findConflict([booking(at(10), at(11), false, 'CANCELLED')], request(at(10), at(11)))
    ).toBeNull();
  });

  it('lists the bookings in the way, earliest first', () => {
    const later = booking(at(10, 30), at(11));
    const earlier = booking(at(9, 30), at(10, 15));
    expect(findConflict([later, earlier], request(at(10), at(11)))?.bookings).toEqual([
      earlier,
      later,
    ]);
  });
});
