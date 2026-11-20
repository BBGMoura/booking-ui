import { useState } from 'react';
import {
  type BusinessHoursInput,
  type CalendarController,
  type EventInput,
  useCalendarController,
} from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/react/interaction';
import listPlugin from '@fullcalendar/react/list';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import { BookingEventContent } from '@/components/bookings/BookingEventContent';
import { BookingsCalendarToolbar } from '@/components/bookings/BookingsCalendarToolbar';
import { EventCalendarCloseIcon } from '@/components/event-calendar-icons';
import { EventCalendarViews } from '@/components/ui/event-calendar-views';
import {
  useResponsiveCalendarView,
  WEEK_VIEW,
  DAY_VIEW,
  MULTI_DAY_VIEW,
} from '@/hooks/use-responsive-calendar-view';
import { cn } from '@/lib/utils';
import { isBookableRange, OPENING_HOURS_BY_DAY, TIME_STEP_MINUTES } from '@/lib/utils/bookingTime';
import {
  MINE_COLOR,
  type BookingDetails,
  type BookingEventProps,
} from '@/lib/utils/calendarEvents';
import { initialScrollTime, toTime } from '@/lib/utils/calendarUtils';

const plugins = [timeGridPlugin, listPlugin, interactionPlugin];

const WIDE_VIEWS = [WEEK_VIEW, DAY_VIEW];
// The multi-day view only fits phones, so it is only offered there.
const MOBILE_VIEWS = [WEEK_VIEW, MULTI_DAY_VIEW, DAY_VIEW];

// FullCalendar ignores a per-view buttonText, so the tab label is set here.
const BUTTONS = { [MULTI_DAY_VIEW]: { text: 'Multi-day' } };

// Phone columns are too narrow for the default header (weekday only), so the
// week and multi-day views also show each day's number.
const MOBILE_WEEK_HEADER_FORMAT = { weekday: 'short', day: 'numeric' } as const;

// Mirrors the backend's `schedule` config, which isn't exposed over the API.
// Per-day closed time is shaded via businessHours.
const OPENING_HOURS: BusinessHoursInput = OPENING_HOURS_BY_DAY.map(({ open, close }, day) => ({
  daysOfWeek: [day],
  startTime: toTime(open),
  endTime: toTime(close),
}));

const CLOSED_HOURS_CLASS = 'bg-muted/60';

// An hour either side of the earliest opening (09:00) and latest closing
// (19:30), so both ends of the day read as closed time rather than being cut
// off. The start stays on the hour because FullCalendar labels slots from
// slotMinTime, so a half-hour start would put every label on the half hour.
const GRID_START_MINUTES = 8 * 60;
const GRID_END_MINUTES = 20 * 60 + 30;

// Tiles shorter than this (in px) put their lines side by side instead of
// stacking them. The registry's default (50px) made an hour-long booking
// count as short, so its details ran together on one line.
const EVENT_SHORT_HEIGHT = 30;

export interface DateSpan {
  start: Date;
  end: Date;
}

interface BookingsCalendarProps {
  /** Changes the view or date from outside, as the booking form does. */
  controller?: CalendarController;
  /**
   * `'auto'` renders the whole grid; `'100%'` fills the parent and scrolls the
   * grid inside it, which needs a parent with a definite height.
   */
  height: 'auto' | '100%';
  events: EventInput[];
  /** The visible range changed (navigating, or switching week and day). */
  onRangeChange?: (range: DateSpan) => void;
  /** A free range that could be booked was dragged out or clicked. */
  onSelect?: (range: DateSpan) => void;
  /** An editable event (only the new booking's placeholder) was dragged or resized. */
  onEventChange?: (event: { id: string; start: Date | null; end: Date | null }) => void;
  /** A booking was clicked; `el` is its tile, for anchoring the details card. */
  onBookingClick?: (details: BookingDetails, el: HTMLElement) => void;
}

/**
 * The bookings calendar: the studio's week and day grid, with its opening
 * hours, and drag-to-book. Built on the registry's EventCalendarViews (left
 * untouched so it can be updated with `shadcn add`) with our own toolbar on
 * top, in place of the registry's EventCalendar wrapper, whose toolbar we
 * restyle. What's shown and what dragging does come from the page.
 */
export function BookingsCalendar({
  controller: outsideController,
  height,
  events,
  onRangeChange,
  onSelect,
  onEventChange,
  onBookingClick,
}: BookingsCalendarProps) {
  const ownController = useCalendarController();
  const controller = outsideController ?? ownController;
  const { isMobile, initialView } = useResponsiveCalendarView(controller);
  const [scrollTime] = useState(() => initialScrollTime(new Date(), GRID_START_MINUTES));

  return (
    <div className={cn('bg-background flex flex-col', height === '100%' && 'h-full')}>
      <BookingsCalendarToolbar
        className="border-b p-4 sm:p-5"
        controller={controller}
        availableViews={isMobile ? MOBILE_VIEWS : WIDE_VIEWS}
      />
      <div className="min-h-0 grow">
        <EventCalendarViews
          controller={controller}
          height={height}
          initialView={initialView}
          views={
            isMobile
              ? {
                  timeGridWeek: { dayHeaderFormat: MOBILE_WEEK_HEADER_FORMAT },
                  // Three days that move along one day at a time, as in Apple Calendar.
                  [MULTI_DAY_VIEW]: {
                    type: 'timeGrid',
                    duration: { days: 3 },
                    dateIncrement: { days: 1 },
                    dayHeaderFormat: MOBILE_WEEK_HEADER_FORMAT,
                  },
                }
              : undefined
          }
          buttons={BUTTONS}
          navLinkDayClick="timeGridDay"
          navLinkWeekClick="timeGridWeek"
          plugins={plugins}
          popoverCloseContent={() => <EventCalendarCloseIcon />}
          borderless
          events={events}
          eventContent={BookingEventContent}
          eventShortHeight={EVENT_SHORT_HEIGHT}
          slotEventOverlap={false}
          nowIndicator
          firstDay={1}
          allDaySlot={false}
          slotMinTime={toTime(GRID_START_MINUTES)}
          slotMaxTime={toTime(GRID_END_MINUTES)}
          scrollTime={scrollTime}
          businessHours={OPENING_HOURS}
          nonBusinessHoursClass={CLOSED_HOURS_CLASS}
          datesSet={(info) => onRangeChange?.({ start: info.start, end: info.end })}
          selectable={!!onSelect}
          // Shows the range being dragged as a placeholder booking with its times,
          // in the colour of the user's own bookings since that's what it becomes.
          // Every real event sets its own colour, so eventColor only reaches it.
          selectMirror
          eventColor={MINE_COLOR}
          // The placeholder already shows the range, so the registry's fill
          // behind it would only double it up.
          highlightClass="hidden"
          snapDuration={toTime(TIME_STEP_MINUTES)}
          selectAllow={(span) => isBookableRange(span)}
          // Moving or resizing the placeholder follows the same rule as dragging out a
          // new range; a drop into closed hours or the past snaps back.
          eventAllow={(span) => isBookableRange(span)}
          // Either edge of the placeholder can be dragged, so its start can move
          // earlier without moving the whole booking.
          eventResizableFromStart
          select={(info) => {
            onSelect?.({ start: info.start, end: info.end });
            info.view.calendar.unselect();
          }}
          eventClick={(info) => {
            // The new booking's placeholder has no details, so clicking it does nothing.
            const { details } = info.event.extendedProps as BookingEventProps;
            if (details) onBookingClick?.(details, info.el);
          }}
          eventDrop={(info) => onEventChange?.(info.event)}
          eventResize={(info) => onEventChange?.(info.event)}
        />
      </div>
    </div>
  );
}
