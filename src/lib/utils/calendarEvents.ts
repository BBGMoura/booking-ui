import type { EventInput } from '@fullcalendar/react';
import type { BookingView, ClassType, Room } from '@/lib/types/booking';

export const ROOM_LABELS: Record<Room, string> = {
  ASTAIRE: 'Astaire',
  BUSSELL: 'Bussell',
  ALEX_MOORE: 'Alex Moore',
  FOSSE: 'Fosse',
};

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  PRIVATE: 'Private',
  PRACTICE: 'Practice',
  GROUP: 'Group',
  UNAVAILABLE: 'Unavailable',
  OTHER: 'Other',
};

const OTHERS_COLOR = 'var(--chart-2)';
const MINE_COLOR = 'var(--chart-1)';
const BUSY_ELSEWHERE_COLOR = 'var(--muted-foreground)';

// Hatched, dashed and see-through so it reads as a layer over the room's grid
// rather than a booking in it.
const BUSY_ELSEWHERE_CLASS =
  'border-dashed opacity-70 bg-[repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_oklab,var(--fc-event-color)_20%,transparent)_6px_12px)]';

const NO_NAME = 'No name';

/**
 * What a booking tile shows, line by line. The tile renders `heading` under
 * the time and `detail` under that, so the most useful line comes first and
 * survives when a short tile collapses to a single line.
 */
export interface BookingEventProps {
  heading: string;
  detail?: string;
  shareable: boolean;
  mine: boolean;
  busyElsewhere?: boolean;
}

/**
 * Regular users get the summary shape from the schedule endpoint
 * (`bookedFrom`/`bookedTo`, no `userUid`); admins and "my bookings" get
 * the detail shape (`dateFrom`/`dateTo`).
 */
type BookingWithEitherDates = BookingView & { bookedFrom?: string; bookedTo?: string };

const startOf = (b: BookingWithEitherDates) => b.dateFrom ?? b.bookedFrom;
const endOf = (b: BookingWithEitherDates) => b.dateTo ?? b.bookedTo;

const isActive = (b: BookingView) => b.status !== 'CANCELLED';

function bookerName(b: BookingView): string {
  const name = [b.firstName, b.lastName].filter(Boolean).join(' ');
  return name || NO_NAME;
}

function toEvent(
  booking: BookingView,
  props: BookingEventProps,
  extra: Omit<EventInput, 'extendedProps'>
): EventInput {
  return {
    id: booking.uid,
    start: startOf(booking),
    end: endOf(booking),
    // Plain-text version of the tile, used by FullCalendar for accessible
    // labels and anywhere our custom tile content isn't rendered.
    title: props.detail ? `${props.heading} · ${props.detail}` : props.heading,
    extendedProps: props,
    ...extra,
  };
}

export interface BuildCalendarEventsOptions {
  /**
   * Show who made each booking. Only admins get names from the schedule
   * endpoint; teachers deliberately can't see who booked.
   */
  showBooker: boolean;
}

/**
 * Builds the calendar events for the current selection.
 *
 * - Room selected: every booking in that room, with the user's own ones
 *   (matched by uid against `mine`, since the schedule doesn't say who booked
 *   for teachers) highlighted. With `showMine`, the user's bookings in other
 *   rooms are added as a "busy elsewhere" layer.
 * - No room: only the user's bookings, across all rooms.
 *
 * Cancelled bookings are not shown.
 */
export function buildCalendarEvents(
  room: Room | null,
  showMine: boolean,
  schedule: BookingView[],
  mine: BookingView[],
  { showBooker }: BuildCalendarEventsOptions
): EventInput[] {
  const myBookings = mine.filter(isActive);

  if (room === null) {
    return myBookings.map((b) =>
      toEvent(
        b,
        {
          heading: ROOM_LABELS[b.room],
          detail: CLASS_TYPE_LABELS[b.classType],
          shareable: b.shareable,
          mine: true,
        },
        { color: MINE_COLOR }
      )
    );
  }

  const myUids = new Set(myBookings.map((b) => b.uid));
  const events = schedule.filter(isActive).map((b) => {
    const classType = CLASS_TYPE_LABELS[b.classType];
    const isMine = myUids.has(b.uid);
    const props: BookingEventProps = isMine
      ? { heading: 'Yours', detail: classType, shareable: b.shareable, mine: true }
      : showBooker
        ? { heading: bookerName(b), detail: classType, shareable: b.shareable, mine: false }
        : { heading: classType, shareable: b.shareable, mine: false };
    return toEvent(b, props, { color: isMine ? MINE_COLOR : OTHERS_COLOR });
  });

  if (showMine) {
    const inRoom = new Set(schedule.map((b) => b.uid));
    for (const b of myBookings) {
      if (b.room === room || inRoom.has(b.uid)) continue;
      events.push(
        toEvent(
          b,
          {
            heading: `Busy · ${ROOM_LABELS[b.room]}`,
            detail: CLASS_TYPE_LABELS[b.classType],
            shareable: b.shareable,
            mine: true,
            busyElsewhere: true,
          },
          {
            id: `busy-${b.uid}`,
            color: BUSY_ELSEWHERE_COLOR,
            classNames: [BUSY_ELSEWHERE_CLASS],
          }
        )
      );
    }
  }

  return events;
}
