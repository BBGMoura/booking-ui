import type { EventDisplayInfo } from '@fullcalendar/react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookingEventProps } from '@/lib/utils/calendarEvents';

// Below this, a tile is too short to stack lines, so it shows the time and
// heading side by side on one line instead.
const COMPACT_BELOW_MINUTES = 45;

function durationMinutes({ start, end }: EventDisplayInfo['event']) {
  return start && end ? (end.getTime() - start.getTime()) / 60_000 : 0;
}

/**
 * A booking tile: the time, then each detail on its own line, most useful
 * first. Lines that don't fit the tile's height are dropped whole rather than
 * cut in half: the column wraps, and the overflowing lines move into a second
 * column that's clipped out of view.
 */
export function BookingEventContent(info: EventDisplayInfo) {
  const { heading, detail, shareable } = info.event.extendedProps as BookingEventProps;
  const compact = durationMinutes(info.event) < COMPACT_BELOW_MINUTES;

  const time = (
    <span className="flex min-w-0 shrink-0 items-center gap-1">
      <span className="truncate">{info.timeText}</span>
      {shareable && (
        <Users className="size-3 shrink-0" role="img" aria-label="Shareable">
          <title>Shareable</title>
        </Users>
      )}
    </span>
  );

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap">
        {time}
        <span className="truncate font-semibold">{heading}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col flex-wrap content-start gap-x-4 overflow-hidden leading-3.5 [&>*]:w-full">
      {time}
      <span className="truncate font-semibold">{heading}</span>
      {detail && <span className="truncate">{detail}</span>}
    </div>
  );
}
