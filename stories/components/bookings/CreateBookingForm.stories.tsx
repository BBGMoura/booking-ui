import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AxiosError } from 'axios';
import { addDays, isWeekend } from 'date-fns';
import { expect, fn, mocked, userEvent, within } from 'storybook/test';
import { BookingSurface } from '@/components/bookings/BookingSurface';
import { CreateBookingForm } from '@/components/bookings/CreateBookingForm';
import { createBooking } from '@/lib/api/booking';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';
import type { BookingView } from '@/lib/types/booking';

// The form refuses past times, so the stories book the next weekday.
let day = addDays(new Date(), 1);
while (isWeekend(day)) day = addDays(day, 1);
const at = (hours: number, minutes = 0) => {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const dragged = { room: 'FOSSE' as const, start: at(10), end: at(11, 30) };

function existing(from: Date, to: Date, shareable = false): BookingView {
  return {
    uid: `${from.getTime()}`,
    userUid: 'someone-else',
    room: 'FOSSE',
    status: 'BOOKED',
    shareable,
    classType: 'GROUP',
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
    totalPrice: 15,
  };
}

const meta: Meta<typeof CreateBookingForm> = {
  title: 'Bookings/CreateBookingForm',
  component: CreateBookingForm,
  parameters: {
    layout: 'centered',
  },
  args: {
    draft: dragged,
    schedule: [],
    onPreviewChange: fn(),
    onBooked: fn(),
    onConflict: fn(),
  },
  beforeEach: () => {
    mocked(getClassTypes).mockResolvedValue(['PRIVATE', 'GROUP', 'PRACTICE']);
    mocked(getDanceClass).mockResolvedValue({
      classType: 'PRIVATE',
      active: true,
      pricePerHour: 20,
      role: 'ROLE_USER',
    });
    mocked(createBooking).mockResolvedValue(existing(at(10), at(11, 30)));
  },
  // In the side panel it shows in beside the calendar, or in the dialog it
  // shows in on phones when a story sets `surface: 'dialog'`.
  decorators: [
    (Story, { parameters }) => {
      const dialog = parameters.surface === 'dialog';
      const surface = (
        <BookingSurface
          sidePanel={!dialog}
          title="New booking"
          description="Choose a room and time, then the booking type."
          onClose={fn()}
        >
          <Story />
        </BookingSurface>
      );
      return dialog ? surface : <div className="flex h-[760px]">{surface}</div>;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof CreateBookingForm>;

/** Opened from a range dragged on the calendar: the room is free */
export const Free: Story = {};

/** Opened from the "New booking" button: no room yet */
export const FromButton: Story = {
  args: { draft: { day } },
};

/** The room's bookings haven't loaded yet, so there's nothing to say about clashes */
export const ScheduleLoading: Story = {
  args: { schedule: null },
};

/** The time overlaps another booking: a warning, but booking is still allowed */
export const OverlapWarning: Story = {
  args: { schedule: [existing(at(11), at(12))] },
};

/** The only overlap is shareable: suggests turning on Shared room */
export const ShareableOverlap: Story = {
  args: { schedule: [existing(at(11), at(12), true)] },
};

/** Book room pressed with nothing chosen */
export const MissingFields: Story = {
  args: { draft: { day } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Book room' }));
    await expect(await canvas.findByText('Choose a room')).toBeInTheDocument();
  },
};

/** Booked over the warning, and the backend refused: the warning turns into an error */
export const RefusedByBackend: Story = {
  args: { schedule: [existing(at(11), at(12))] },
  play: async ({ canvasElement }) => {
    mocked(createBooking).mockRejectedValue(
      new AxiosError('Bad request', '400', undefined, undefined, {
        status: 400,
        data: {
          status: 400,
          error: 'BOOKING_CONFLICT',
          message: 'Booking timeslot is unavailable.',
        },
      } as never)
    );
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await canvas.findByRole('combobox', { name: 'Booking type' }));
    await userEvent.click(await body.findByRole('option', { name: 'Private lesson' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Book room' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Overlaps a booking');
  },
};

/** On phones the form shows in a dialog instead of the side panel */
export const InDialog: Story = {
  parameters: { surface: 'dialog', layout: 'fullscreen' },
};
