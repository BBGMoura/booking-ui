import { render } from '@testing-library/react';
import type { CalendarController } from '@fullcalendar/react';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';

type Span = { start: Date; end: Date };
type Allow = (span: Span) => boolean;

type ViewProps = {
  selectAllow: Allow;
  eventAllow: Allow;
  eventResizableFromStart?: boolean;
  views?: Record<string, unknown>;
  buttons?: Record<string, { text: string }>;
};

let mockIsMobile = false;
jest.mock('@/hooks/use-media-query', () => ({ useMediaQuery: () => mockIsMobile }));

const mockToolbarProps: { current: { availableViews: string[] } } = {
  current: { availableViews: [] },
};

const mockViewProps: { current: ViewProps } = {
  current: { selectAllow: () => true, eventAllow: () => true },
};

jest.mock('@/components/ui/event-calendar-views', () => ({
  EventCalendarViews: (props: ViewProps) => {
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
  BookingsCalendarToolbar: (props: { availableViews: string[] }) => {
    mockToolbarProps.current = props;
    return null;
  },
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

describe('BookingsCalendar placeholder', () => {
  it('can be resized from its start as well as its end', () => {
    expect(renderCalendar().eventResizableFromStart).toBe(true);
  });
});

describe('BookingsCalendar multi-day view', () => {
  afterEach(() => {
    mockIsMobile = false;
  });

  it('offers Week, Multi-day and Day on phones, with a 3-day view moving a day at a time', () => {
    mockIsMobile = true;
    const props = renderCalendar();
    expect(mockToolbarProps.current.availableViews).toEqual([
      'timeGridWeek',
      'timeGridMultiDay',
      'timeGridDay',
    ]);
    expect(props.views?.timeGridMultiDay).toMatchObject({
      type: 'timeGrid',
      duration: { days: 3 },
      dateIncrement: { days: 1 },
      dayHeaderFormat: { weekday: 'short', day: 'numeric' },
    });
    expect(props.buttons?.timeGridMultiDay.text).toBe('Multi-day');
  });

  it('offers only Week and Day on wide screens', () => {
    renderCalendar();
    expect(mockToolbarProps.current.availableViews).toEqual(['timeGridWeek', 'timeGridDay']);
  });
});
