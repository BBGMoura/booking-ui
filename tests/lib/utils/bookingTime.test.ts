import { durationInHours, toOffsetDateTime, validateBookingTime } from '@/lib/utils/bookingTime';

// 2026-11-18 is a Wednesday, 2026-11-21 a Saturday, 2026-11-22 a Sunday.
const at = (day: number, hours: number, minutes = 0, seconds = 0) =>
  new Date(2026, 10, day, hours, minutes, seconds);

describe('validateBookingTime', () => {
  it('accepts a valid range', () => {
    expect(validateBookingTime(at(18, 10), at(18, 11))).toBeNull();
  });

  it('accepts the shortest booking, 15 minutes', () => {
    expect(validateBookingTime(at(18, 10), at(18, 10, 15))).toBeNull();
  });

  it('rejects an end that is not after the start', () => {
    expect(validateBookingTime(at(18, 11), at(18, 10))).toMatch(/before the end/);
    expect(validateBookingTime(at(18, 10), at(18, 10))).toMatch(/before the end/);
  });

  it('rejects a booking under 15 minutes', () => {
    expect(validateBookingTime(at(18, 10), at(18, 10, 10))).toMatch(/at least 15 minutes/);
  });

  it('rejects times off the 5-minute interval', () => {
    expect(validateBookingTime(at(18, 10, 2), at(18, 11))).toMatch(/5-minute/);
    expect(validateBookingTime(at(18, 10), at(18, 11, 1))).toMatch(/5-minute/);
    expect(validateBookingTime(at(18, 10, 0, 30), at(18, 11))).toMatch(/5-minute/);
  });

  it('rejects a booking that spans two days', () => {
    expect(validateBookingTime(at(18, 18), at(19, 10))).toMatch(/same day/);
  });

  it('allows weekday bookings from 09:00 to 19:00 and no further', () => {
    expect(validateBookingTime(at(18, 9), at(18, 10))).toBeNull();
    expect(validateBookingTime(at(18, 18), at(18, 19))).toBeNull();
    expect(validateBookingTime(at(18, 8, 45), at(18, 10))).toMatch(/opening hours/);
    expect(validateBookingTime(at(18, 18), at(18, 19, 15))).toMatch(/opening hours/);
  });

  it('rejects a start at closing time', () => {
    expect(validateBookingTime(at(18, 19), at(18, 19, 15))).toMatch(/opening hours/);
  });

  it('uses Saturday hours (09:30 to 19:30)', () => {
    expect(validateBookingTime(at(21, 9, 30), at(21, 10))).toBeNull();
    expect(validateBookingTime(at(21, 19), at(21, 19, 30))).toBeNull();
    expect(validateBookingTime(at(21, 9), at(21, 10))).toMatch(/opening hours/);
  });

  it('uses Sunday hours (11:00 to 17:00)', () => {
    expect(validateBookingTime(at(22, 11), at(22, 12))).toBeNull();
    expect(validateBookingTime(at(22, 16), at(22, 17))).toBeNull();
    expect(validateBookingTime(at(22, 10), at(22, 12))).toMatch(/opening hours/);
    expect(validateBookingTime(at(22, 16), at(22, 17, 30))).toMatch(/opening hours/);
  });
});

describe('toOffsetDateTime', () => {
  it('keeps the local wall-clock time and carries an offset', () => {
    expect(toOffsetDateTime(at(18, 10, 5))).toMatch(/^2026-11-18T10:05:00(Z|[+-]\d{2}:\d{2})$/);
  });
});

describe('durationInHours', () => {
  it('returns fractional hours', () => {
    expect(durationInHours(at(18, 10), at(18, 11, 30))).toBe(1.5);
  });
});
