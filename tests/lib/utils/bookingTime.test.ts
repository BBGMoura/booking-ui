import {
  atMinutes,
  defaultBookingSlot,
  durationInHours,
  endTimeOptions,
  formatDuration,
  isBookableRange,
  startTimeOptions,
  toOffsetDateTime,
  validateBookingTime,
} from '@/lib/utils/bookingTime';

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

describe('atMinutes', () => {
  it('returns the time that many minutes after midnight on the day', () => {
    expect(atMinutes(at(18, 15, 40), 9 * 60 + 30)).toEqual(at(18, 9, 30));
  });
});

describe('startTimeOptions', () => {
  it('runs every 15 minutes from opening to the last start that fits a booking', () => {
    const times = startTimeOptions(at(22, 0));
    expect(times[0]).toBe(11 * 60);
    expect(times[1]).toBe(11 * 60 + 15);
    expect(times[times.length - 1]).toBe(16 * 60 + 45);
  });
});

describe('endTimeOptions', () => {
  it('runs from the shortest booking after the start to closing', () => {
    const times = endTimeOptions(at(21, 0), 18 * 60);
    expect(times[0]).toBe(18 * 60 + 15);
    expect(times[times.length - 1]).toBe(19 * 60 + 30);
  });
});

describe('defaultBookingSlot', () => {
  it('suggests an hour from the next full hour today', () => {
    expect(defaultBookingSlot(at(18, 0), at(18, 13, 20))).toEqual({ start: 14 * 60, end: 15 * 60 });
  });

  it('starts at opening before the studio opens, or on another day', () => {
    expect(defaultBookingSlot(at(18, 0), at(18, 6, 10))).toEqual({ start: 9 * 60, end: 10 * 60 });
    expect(defaultBookingSlot(at(22, 0), at(18, 13, 20))).toEqual({ start: 11 * 60, end: 12 * 60 });
  });

  it('suggests nothing when an hour no longer fits before closing', () => {
    expect(defaultBookingSlot(at(18, 0), at(18, 18, 5))).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each([
    [15, '15 min'],
    [60, '1 hr'],
    [90, '1 hr 30 min'],
  ])('formats %i minutes as %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });

  it('shortens minutes to m when asked', () => {
    expect(formatDuration(90, { short: true })).toBe('1 hr 30m');
    expect(formatDuration(15, { short: true })).toBe('15m');
    expect(formatDuration(60, { short: true })).toBe('1 hr');
  });
});

// Wednesday 18 November 2026, 08:20.
const NOW = new Date(2026, 10, 18, 8, 20);

describe('isBookableRange', () => {
  it('allows a valid future range', () => {
    expect(
      isBookableRange({ start: new Date(2026, 10, 18, 10), end: new Date(2026, 10, 18, 11) }, NOW)
    ).toBe(true);
  });

  it('refuses a range that has started', () => {
    expect(
      isBookableRange({ start: new Date(2026, 10, 17, 10), end: new Date(2026, 10, 17, 11) }, NOW)
    ).toBe(false);
  });

  it('refuses a range outside opening hours', () => {
    expect(
      isBookableRange({ start: new Date(2026, 10, 18, 19), end: new Date(2026, 10, 18, 20) }, NOW)
    ).toBe(false);
  });
});
