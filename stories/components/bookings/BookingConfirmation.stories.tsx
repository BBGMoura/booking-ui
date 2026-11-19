import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { BookingConfirmation } from '@/components/bookings/BookingConfirmation';
import type { BookingView } from '@/lib/types/booking';

const saved: BookingView = {
  uid: 'b1',
  userUid: 'u1',
  room: 'FOSSE',
  status: 'BOOKED',
  shareable: true,
  classType: 'PRIVATE',
  dateFrom: '2026-11-19T15:00:00Z',
  dateTo: '2026-11-19T16:15:00Z',
  totalPrice: 25,
};

const meta: Meta<typeof BookingConfirmation> = {
  title: 'Bookings/BookingConfirmation',
  component: BookingConfirmation,
  parameters: {
    layout: 'centered',
  },
  args: {
    booking: saved,
    onDone: fn(),
  },
  // Sized like the side panel it shows in.
  decorators: [
    (Story) => (
      <div className="bg-card flex h-[640px] w-96 flex-col rounded-2xl border p-6 shadow-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BookingConfirmation>;

/** Just booked, shareable */
export const Shareable: Story = {};

/** Just booked, the room to themselves */
export const NotShareable: Story = {
  args: { booking: { ...saved, shareable: false, classType: 'GROUP', totalPrice: 12.5 } },
};
