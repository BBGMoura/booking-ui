import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { addDays, startOfWeek } from 'date-fns';
import { fn } from 'storybook/test';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';
import { previewEventFor } from '@/hooks/use-new-booking';
import type { BookingView, ClassType, Room } from '@/lib/types/booking';
import { buildCalendarEvents } from '@/lib/utils/calendarEvents';

const meta: Meta<typeof BookingsCalendar> = {
  title: 'Bookings/BookingsCalendar',
  component: BookingsCalendar,
  parameters: {
    layout: 'padded',
  },
  args: {
    events: [],
    onRangeChange: fn(),
    onSelect: fn(),
    onEventChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BookingsCalendar>;

/** Full-height grid, as on phones where the whole page scrolls */
export const FullHeight: Story = {
  args: { height: 'auto' },
};

/** Fills a fixed-height parent and scrolls the grid inside it, as on desktop */
export const FillsParent: Story = {
  args: { height: '100%' },
  decorators: [
    (Story) => (
      <div className="h-[480px] overflow-hidden rounded-2xl border">
        <Story />
      </div>
    ),
  ],
};

// ─── Tile states ──────────────────────────────────────────────────────────────

// The calendar opens on the current week, so the bookings are placed in it.
const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
const at = (day: number, hours: number, minutes = 0) => {
  const d = addDays(monday, day);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

function booking(
  uid: string,
  room: Room,
  classType: ClassType,
  from: Date,
  to: Date,
  shareable = false
): BookingView {
  return {
    uid,
    userUid: uid.startsWith('mine') ? 'me' : 'someone-else',
    room,
    status: 'BOOKED',
    shareable,
    classType,
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
    totalPrice: 20,
  };
}

const othersBooking = booking('others-1', 'FOSSE', 'GROUP', at(0, 10), at(0, 11));
const othersShareable = booking('others-2', 'FOSSE', 'PRACTICE', at(1, 11), at(1, 12), true);
const myBooking = booking('mine-1', 'FOSSE', 'PRIVATE', at(0, 13), at(0, 14, 30));
const myShareable = booking('mine-2', 'FOSSE', 'GROUP', at(2, 15), at(2, 16), true);
const myBookingElsewhere = booking('mine-3', 'ASTAIRE', 'PRIVATE', at(1, 15), at(1, 16, 30));

/**
 * Every kind of tile, as a teacher sees Fosse's week with "Show my bookings" on:
 *
 * - Mon 10:00, someone else's booking (green)
 * - Mon 13:00, your booking (orange)
 * - Tue 11:00 and Wed 15:00, shareable bookings (people icon)
 * - Tue 15:00, your booking in another room: "busy elsewhere" (grey)
 * - Thu 10:00, a new booking being made, before a booking type is chosen
 * - Fri 13:00, a new booking being made, once a booking type is chosen
 */
export const TileStates: Story = {
  args: {
    height: 'auto',
    events: [
      ...buildCalendarEvents(
        'FOSSE',
        true,
        [othersBooking, othersShareable, myBooking, myShareable],
        [myBooking, myShareable, myBookingElsewhere],
        { showBooker: false, viewerName: 'Jane Smith' }
      ),
      previewEventFor({
        room: 'FOSSE',
        date: at(3, 0),
        start: 10 * 60,
        end: 11 * 60 + 15,
        isShareable: false,
      })!,
      {
        ...previewEventFor({
          room: 'FOSSE',
          date: at(4, 0),
          start: 13 * 60,
          end: 14 * 60,
          classType: 'PRIVATE',
          isShareable: false,
        })!,
        id: 'new-booking-with-class',
      },
    ],
  },
};
