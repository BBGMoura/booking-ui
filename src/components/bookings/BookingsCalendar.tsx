import {
  type CalendarController,
  type CalendarOptions,
  useCalendarController,
} from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/react/interaction';
import listPlugin from '@fullcalendar/react/list';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import { BookingsCalendarToolbar } from '@/components/bookings/BookingsCalendarToolbar';
import { EventCalendarCloseIcon } from '@/components/event-calendar-icons';
import { EventCalendarViews } from '@/components/ui/event-calendar-views';
import { cn } from '@/lib/utils';

const plugins = [timeGridPlugin, listPlugin, interactionPlugin];

interface BookingsCalendarProps
  extends Omit<
    CalendarOptions,
    'class' | 'className' | 'headerToolbar' | 'footerToolbar' | 'plugins' | 'initialView'
  > {
  /** The views offered in the toolbar; the first one is shown initially. */
  availableViews: string[];
  /**
   * `'auto'` renders the whole grid; `'100%'` fills the parent and scrolls the
   * grid inside it, which needs a parent with a definite height.
   */
  height: 'auto' | '100%';
  /** Pass one in to change the view or date from outside the calendar. */
  controller?: CalendarController;
}

/**
 * The bookings calendar: the registry's EventCalendarViews (left untouched so it
 * can be updated with `shadcn add`) with our own toolbar on top. It replaces the
 * registry's EventCalendar wrapper, whose toolbar we restyle.
 */
export function BookingsCalendar({
  availableViews,
  height,
  controller: outsideController,
  ...options
}: BookingsCalendarProps) {
  const ownController = useCalendarController();
  const controller = outsideController ?? ownController;

  return (
    <div className={cn('bg-background flex flex-col', height === '100%' && 'h-full')}>
      <BookingsCalendarToolbar
        className="border-b p-4 sm:p-5"
        controller={controller}
        availableViews={availableViews}
      />
      <div className="min-h-0 grow">
        <EventCalendarViews
          controller={controller}
          height={height}
          initialView={availableViews[0]}
          navLinkDayClick="timeGridDay"
          navLinkWeekClick="timeGridWeek"
          plugins={plugins}
          popoverCloseContent={() => <EventCalendarCloseIcon />}
          borderless
          {...options}
        />
      </div>
    </div>
  );
}
