import { initialScrollTime, toTime } from '@/lib/utils/calendarUtils';

const at = (hours: number, minutes = 0) => new Date(2026, 10, 18, hours, minutes);
const EIGHT_THIRTY = 8 * 60 + 30;

describe('toTime', () => {
  it('formats minutes after midnight as HH:MM', () => {
    expect(toTime(7 * 60)).toBe('07:00');
    expect(toTime(EIGHT_THIRTY)).toBe('08:30');
    expect(toTime(19 * 60 + 5)).toBe('19:05');
  });
});

describe('initialScrollTime', () => {
  it('opens a quarter before the hour preceding now', () => {
    expect(initialScrollTime(at(14, 20), EIGHT_THIRTY)).toBe('12:45');
  });

  it('ignores the minutes of now', () => {
    expect(initialScrollTime(at(14, 59), EIGHT_THIRTY)).toBe('12:45');
  });

  it('opens at the grid start early in the day', () => {
    expect(initialScrollTime(at(6, 30), EIGHT_THIRTY)).toBe('08:30');
    expect(initialScrollTime(at(9, 50), EIGHT_THIRTY)).toBe('08:30');
  });

  it('opens a quarter before an hour once that is after the grid start', () => {
    expect(initialScrollTime(at(10, 0), EIGHT_THIRTY)).toBe('08:45');
  });
});
