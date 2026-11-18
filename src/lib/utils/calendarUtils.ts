export const toTime = (hour: number, minute = 0) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * Where the time grid should open: an hour before `now`, so the current time is
 * in view with a little context above it, but never above the first hour shown.
 * It stops 15 minutes short of that hour because a label sitting exactly on the
 * top edge is clipped by the day headers.
 */
export const initialScrollTime = (now: Date, gridStartHour: number) => {
  const hour = now.getHours() - 1;
  return hour > gridStartHour ? toTime(hour - 1, 45) : toTime(gridStartHour);
};
