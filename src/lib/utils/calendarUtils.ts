export const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Where the time grid should open: an hour before the current hour, so now is
 * in view with a little context above it, but never above the grid's start.
 * It stops 15 minutes short of that hour because a label sitting exactly on the
 * top edge is clipped by the day headers.
 *
 * @param gridStartMinutes the grid's first visible time, in minutes after midnight
 * @return an `HH:MM` time for FullCalendar's `scrollTime`
 */
export const initialScrollTime = (now: Date, gridStartMinutes: number) =>
  toTime(Math.max(gridStartMinutes, (now.getHours() - 1) * 60 - 15));
