import type { EventInput } from '@fullcalendar/react';
import type { BookingView, Room } from '@/lib/types/booking';

export const ROOM_LABELS: Record<Room, string> = {
  ASTAIRE: 'Astaire',
  BUSSELL: 'Bussell',
  ALEX_MOORE: 'Alex Moore',
  FOSSE: 'Fosse',
};

const OTHERS_COLOR = 'var(--chart-2)';
const MINE_COLOR = 'var(--chart-1)';
const BUSY_ELSEWHERE_COLOR = 'var(--muted-foreground)';

// Hatched, dashed and see-through so it reads as a layer over the room's grid
// rather than a booking in it.
const BUSY_ELSEWHERE_CLASS =
  'border-dashed opacity-70 bg-[repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_oklab,var(--fc-event-color)_20%,transparent)_6px_12px)]';

/**
 * Regular users get the summary shape from the schedule endpoint
 * (`bookedFrom`/`bookedTo`, no `userUid`); admins and "my bookings" get
 * the detail shape (`dateFrom`/`dateTo`).
 */
type BookingWithEitherDates = BookingView & { bookedFrom?: string; bookedTo?: string };

const startOf = (b: BookingWithEitherDates) => b.dateFrom ?? b.bookedFrom;
const endOf = (b: BookingWithEitherDates) => b.dateTo ?? b.bookedTo;

const isActive = (b: BookingView) => b.status !== 'CANCELLED';

function toEvent(booking: BookingView, extra: EventInput): EventInput {
  return {
    id: booking.uid,
    start: startOf(booking),
    end: endOf(booking),
    ...extra,
  };
}

/**
 * Builds the calendar events for the current selection.
 *
 * - Room selected: every booking in that room, with the user's own ones
 *   (matched by uid against `mine`, since the schedule doesn't say who booked)
 *   highlighted. With `showMine`, the user's bookings in other rooms are added
 *   as a "busy elsewhere" layer.
 * - No room: only the user's bookings, across all rooms.
 *
 * Cancelled bookings are not shown.
 */
export function buildCalendarEvents(
  room: Room | null,
  showMine: boolean,
  schedule: BookingView[],
  mine: BookingView[]
): EventInput[] {
  const myBookings = mine.filter(isActive);

  if (room === null) {
    return myBookings.map((b) =>
      toEvent(b, {
        title: `${ROOM_LABELS[b.room]} · ${b.classType}`,
        color: MINE_COLOR,
        extendedProps: { mine: true },
      })
    );
  }

  const myUids = new Set(myBookings.map((b) => b.uid));
  const events = schedule.filter(isActive).map((b) => {
    const isMine = myUids.has(b.uid);
    return toEvent(b, {
      title: isMine ? `Yours · ${b.classType}` : b.classType,
      color: isMine ? MINE_COLOR : OTHERS_COLOR,
      extendedProps: { mine: isMine },
    });
  });

  if (showMine) {
    const inRoom = new Set(schedule.map((b) => b.uid));
    for (const b of myBookings) {
      if (b.room === room || inRoom.has(b.uid)) continue;
      events.push(
        toEvent(b, {
          id: `busy-${b.uid}`,
          title: `Busy · ${ROOM_LABELS[b.room]}`,
          color: BUSY_ELSEWHERE_COLOR,
          classNames: [BUSY_ELSEWHERE_CLASS],
          extendedProps: { mine: true, busyElsewhere: true },
        })
      );
    }
  }

  return events;
}
