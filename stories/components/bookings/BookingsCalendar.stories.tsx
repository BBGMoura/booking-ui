import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { BookingsCalendar } from '@/components/bookings/BookingsCalendar';

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
