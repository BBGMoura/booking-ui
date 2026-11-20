import type { BookingView } from '@/lib/types/booking';
import { overlappingBookings } from '@/lib/utils/bookingOverlaps';

// 2026-11-18, hours and minutes in local time.
const at = (hours: number, minutes = 0) => new Date(2026, 10, 18, hours, minutes);

function booking(from: Date, to: Date, status = 'BOOKED'): BookingView {
  return {
    uid: `${from.getTime()}-${to.getTime()}-${status}`,
    room: 'ASTAIRE',
    classType: 'GROUP',
    status,
    shareable: false,
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
  } as BookingView;
}

describe('overlappingBookings', () => {
  it('finds nothing in an empty room', () => {
    expect(overlappingBookings([], { start: at(10), end: at(11) })).toEqual([]);
  });

  it('leaves out bookings that only touch end to start', () => {
    const schedule = [booking(at(9), at(10)), booking(at(11), at(12))];
    expect(overlappingBookings(schedule, { start: at(10), end: at(11) })).toEqual([]);
  });

  it('returns the overlapping bookings earliest first', () => {
    const late = booking(at(10, 30), at(12));
    const early = booking(at(9, 30), at(10, 15));
    const schedule = [late, booking(at(12), at(13)), early];
    expect(overlappingBookings(schedule, { start: at(10), end: at(11) })).toEqual([early, late]);
  });

  it('ignores cancelled bookings', () => {
    const schedule = [booking(at(10), at(11), 'CANCELLED')];
    expect(overlappingBookings(schedule, { start: at(10), end: at(11) })).toEqual([]);
  });

  it('reads the schedule’s bookedFrom/bookedTo shape too', () => {
    const summary = {
      uid: 's1',
      status: 'BOOKED',
      shareable: true,
      bookedFrom: at(10).toISOString(),
      bookedTo: at(11).toISOString(),
    } as unknown as BookingView;
    expect(overlappingBookings([summary], { start: at(10, 30), end: at(11, 30) })).toEqual([
      summary,
    ]);
  });
});
