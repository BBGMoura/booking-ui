import { useEffect, useRef, useState } from 'react';
import type { CalendarController } from '@fullcalendar/react';
import { useMediaQuery } from '@/hooks/use-media-query';

export const WEEK_VIEW = 'timeGridWeek';
export const DAY_VIEW = 'timeGridDay';

// The same width the sidebar collapses at (MOBILE_BREAKPOINT in use-mobile.ts,
// 768px, as a max-width query).
export const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Makes the calendar open on the day view on phones, where seven day columns
 * don't fit, and on the week view elsewhere. Crossing the breakpoint (rotating
 * a tablet, resizing a window) switches the view to match; within a size the
 * user's own choice of view is left alone.
 */
export function useResponsiveCalendarView(controller: CalendarController) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [initialView] = useState(() => (isMobile ? DAY_VIEW : WEEK_VIEW));
  const previous = useRef(isMobile);

  useEffect(() => {
    if (previous.current === isMobile) return;
    previous.current = isMobile;
    controller.changeView(isMobile ? DAY_VIEW : WEEK_VIEW);
  }, [isMobile, controller]);

  return { isMobile, initialView };
}
