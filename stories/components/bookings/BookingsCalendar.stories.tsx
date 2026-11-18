import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';

const meta: Meta<typeof BookingsCalendar> = {
  title: 'Bookings/BookingsCalendar',
  component: BookingsCalendar,
  parameters: {
    layout: 'padded',
  },
  args: {
    availableViews: ['timeGridWeek', 'timeGridDay'],
    firstDay: 1,
    allDaySlot: false,
    nowIndicator: true,
    slotMinTime: '08:00',
    slotMaxTime: '20:30',
    businessHours: [
      { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '19:00' },
      { daysOfWeek: [6], startTime: '09:30', endTime: '19:30' },
      { daysOfWeek: [0], startTime: '11:00', endTime: '17:00' },
    ],
    nonBusinessHoursClass: 'bg-muted/60',
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
