import { initialScrollTime, toTime } from '@/lib/utils/calendarUtils';

const at = (hours: number, minutes = 0) => new Date(2026, 10, 18, hours, minutes);

describe('toTime', () => {
  it('pads hours and minutes to two digits', () => {
    expect(toTime(7)).toBe('07:00');
    expect(toTime(19, 5)).toBe('19:05');
  });
});

describe('initialScrollTime', () => {
  it('opens a quarter before the hour preceding now', () => {
    expect(initialScrollTime(at(14, 20), 7)).toBe('12:45');
  });

  it('ignores the minutes of now', () => {
    expect(initialScrollTime(at(14, 59), 7)).toBe('12:45');
  });

  it('opens at the grid start early in the day', () => {
    expect(initialScrollTime(at(6, 30), 7)).toBe('07:00');
    expect(initialScrollTime(at(8, 10), 7)).toBe('07:00');
  });

  it('opens a quarter before the grid start hour once there is room', () => {
    expect(initialScrollTime(at(9, 0), 7)).toBe('07:45');
  });
});
