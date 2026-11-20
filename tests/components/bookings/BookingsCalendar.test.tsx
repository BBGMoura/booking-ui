import { render } from '@testing-library/react';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';

type Allow = (span: { start: Date; end: Date }) => boolean;
let calendarProps: { selectAllow: Allow; eventAllow: Allow };

// FullCalendar ships ES modules Jest doesn't transform, and only the props
// handed to the generated calendar matter here.
jest.mock('@fullcalendar/react', () => ({ useCalendarController: () => ({}) }));
jest.mock('@fullcalendar/react/interaction', () => ({}));
jest.mock('@fullcalendar/react/list', () => ({}));
jest.mock('@fullcalendar/react/timegrid', () => ({}));
jest.mock('@/components/event-calendar-icons', () => ({ EventCalendarCloseIcon: () => null }));
jest.mock('@/components/ui/event-calendar-views', () => ({
  EventCalendarViews: (props: typeof calendarProps) => {
    calendarProps = props;
    return null;
  },
}));
jest.mock('@/components/bookings/BookingsCalendarToolbar', () => ({
  BookingsCalendarToolbar: () => null,
}));

// 2026-11-20 is a Friday, open 09:00–19:00. The clock is at 08:20 that day.
const at = (hours: number, minutes = 0) => new Date(2026, 10, 20, hours, minutes);

beforeEach(() => {
  jest.useFakeTimers({ now: at(8, 20) });
  render(<BookingsCalendar height="auto" events={[]} onSelect={jest.fn()} />);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('BookingsCalendar', () => {
  it.each(['selectAllow', 'eventAllow'] as const)(
    '%s allows a range within opening hours',
    (name) => {
      expect(calendarProps[name]({ start: at(10), end: at(11) })).toBe(true);
    }
  );

  it.each(['selectAllow', 'eventAllow'] as const)(
    '%s refuses a range that starts before opening',
    (name) => {
      expect(calendarProps[name]({ start: at(8, 30), end: at(10) })).toBe(false);
    }
  );

  it.each(['selectAllow', 'eventAllow'] as const)(
    '%s refuses a range that ends after closing',
    (name) => {
      expect(calendarProps[name]({ start: at(18), end: at(19, 15) })).toBe(false);
    }
  );

  it('refuses moving the new booking into the past', () => {
    jest.setSystemTime(at(12));

    expect(calendarProps.eventAllow({ start: at(11), end: at(13) })).toBe(false);
  });
});
