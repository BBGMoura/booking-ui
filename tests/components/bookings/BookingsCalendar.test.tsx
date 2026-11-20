import { render } from '@testing-library/react';
import type { CalendarController } from '@fullcalendar/react';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';

type Span = { start: Date; end: Date };
type Allow = (span: Span) => boolean;

const mockViewProps: { current: { selectAllow: Allow; eventAllow: Allow } } = {
  current: { selectAllow: () => true, eventAllow: () => true },
};

jest.mock('@/components/ui/event-calendar-views', () => ({
  EventCalendarViews: (props: { selectAllow: Allow; eventAllow: Allow }) => {
    mockViewProps.current = props;
    return null;
  },
}));

// FullCalendar ships ES modules, which Jest doesn't transform.
jest.mock('@fullcalendar/react', () => ({ useCalendarController: () => ({}) }));
jest.mock('@fullcalendar/react/interaction', () => ({}));
jest.mock('@fullcalendar/react/list', () => ({}));
jest.mock('@fullcalendar/react/timegrid', () => ({}));

jest.mock('@/components/bookings/BookingsCalendarToolbar', () => ({
  BookingsCalendarToolbar: () => null,
}));

const renderCalendar = () => {
  render(
    <BookingsCalendar
      controller={{} as CalendarController}
      height="auto"
      events={[]}
      onSelect={jest.fn()}
    />
  );
  return mockViewProps.current;
};

// A Monday far in the future (weekday hours are 09:00-19:00).
const at = (hours: number, minutes = 0) => new Date(2099, 0, 5, hours, minutes);

describe.each(['selectAllow', 'eventAllow'] as const)('BookingsCalendar %s', (rule) => {
  it('allows a range within opening hours', () => {
    expect(renderCalendar()[rule]({ start: at(10), end: at(11) })).toBe(true);
  });

  it('rejects a range starting before opening time', () => {
    expect(renderCalendar()[rule]({ start: at(8, 30), end: at(9, 30) })).toBe(false);
  });

  it('rejects a range ending after closing time', () => {
    expect(renderCalendar()[rule]({ start: at(18), end: at(19, 30) })).toBe(false);
  });

  it('rejects a range in the past', () => {
    const start = new Date(2000, 0, 3, 10);
    const end = new Date(2000, 0, 3, 11);
    expect(renderCalendar()[rule]({ start, end })).toBe(false);
  });
});
