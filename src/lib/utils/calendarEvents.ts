import type { EventInput } from '@fullcalendar/react';
import type { BookingStatus, BookingView, ClassType, Room } from '@/lib/types/booking';

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
  UNAVAILABLE: 'Closed',
  OTHER: 'Other',
};

const OTHERS_COLOR = 'var(--chart-2)';
export const MINE_COLOR = 'var(--chart-1)';
const BUSY_ELSEWHERE_COLOR = 'var(--muted-foreground)';

const NO_NAME = 'No name';

/**
 * What the details popover shows for a booking. Fields the viewer isn't
 * allowed to see are left out here rather than hidden in the popover, so the
 * popover can't leak them.
 */
export interface BookingDetails {
  uid: string;
  start: string;
  end: string;
  classType: ClassType;
  shareable: boolean;
  room?: Room;
  status?: BookingStatus;
  price?: number;
  bookerName?: string;
  /** Whether the viewer may cancel it: admins any booking, teachers their own. */
  cancellable: boolean;
}

/**
 * What a booking tile shows, line by line. The tile renders `heading` under
 * the time and `detail` under that; a short tile collapses to a single line
 * and keeps only the heading.
 */
export interface BookingEventProps {
  heading: string;
  /** Missing only on the new booking's placeholder, which isn't a booking yet. */
  details?: BookingDetails;
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
export type BookingWithEitherDates = BookingView & { bookedFrom?: string; bookedTo?: string };

export const startOf = (b: BookingWithEitherDates) => b.dateFrom ?? b.bookedFrom;
export const endOf = (b: BookingWithEitherDates) => b.dateTo ?? b.bookedTo;

const isActive = (b: BookingView) => b.status !== 'CANCELLED';

function fullName(b: BookingView): string | undefined {
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || undefined;
}

function bookerName(b: BookingView): string {
  return fullName(b) ?? NO_NAME;
}

/**
 * `own` is the booking from the user's own list when it's theirs: the schedule
 * gives teachers a summary with no price, so the price comes from there.
 * Admins see everything, teachers see everything about their own bookings
 * except status, and only time, class type and shareable on others'.
 */
function detailsOf(b: BookingView, own: BookingView | undefined, admin: boolean): BookingDetails {
  const source = own ?? b;
  const details: BookingDetails = {
    uid: b.uid,
    start: startOf(b),
    end: endOf(b),
    classType: b.classType,
    shareable: b.shareable,
    cancellable: admin || !!own,
  };
  if (admin) {
    return {
      ...details,
      room: b.room,
      status: b.status,
      price: b.totalPrice,
      // The tile needs a placeholder to keep its layout; the details card just leaves it out.
      bookerName: fullName(b),
    };
  }
  if (own) return { ...details, room: source.room, price: source.totalPrice };
  return details;
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
    title: [props.heading, props.detail, props.mine && !props.busyElsewhere && 'yours']
      .filter(Boolean)
      .join(' · '),
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
  /**
   * The logged-in user's name, shown on their own bookings. Taken from the
   * session rather than the booking, since teachers' schedule has no names.
   */
  viewerName?: string;
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
  { showBooker, viewerName }: BuildCalendarEventsOptions
): EventInput[] {
  const myBookings = mine.filter(isActive);

  if (room === null) {
    return myBookings.map((b) =>
      toEvent(
        b,
        {
          heading: ROOM_LABELS[b.room],
          details: detailsOf(b, b, showBooker),
          detail: CLASS_TYPE_LABELS[b.classType],
          shareable: b.shareable,
          mine: true,
        },
        { color: MINE_COLOR }
      )
    );
  }

  const myUids = new Set(myBookings.map((b) => b.uid));
  const myByUid = new Map(myBookings.map((b) => [b.uid, b]));
  const events = schedule.filter(isActive).map((b) => {
    const classType = CLASS_TYPE_LABELS[b.classType];
    const isMine = myUids.has(b.uid);
    // Every tile reads class type, then who booked it, as far as the viewer
    // is allowed to know: admins see everyone, teachers only themselves.
    const who = isMine ? viewerName || NO_NAME : showBooker ? bookerName(b) : undefined;
    const props: BookingEventProps = {
      heading: classType,
      details: detailsOf(b, myByUid.get(b.uid), showBooker),
      detail: who,
      shareable: b.shareable,
      mine: isMine,
    };
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
            details: detailsOf(b, b, showBooker),
            detail: CLASS_TYPE_LABELS[b.classType],
            shareable: b.shareable,
            mine: true,
            busyElsewhere: true,
          },
          {
            id: `busy-${b.uid}`,
            color: BUSY_ELSEWHERE_COLOR,
          }
        )
      );
    }
  }

  return events;
}
