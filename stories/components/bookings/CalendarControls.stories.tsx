import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { CalendarControls } from '@/components/bookings/CalendarControls';
import { useCalendarView } from '@/hooks/use-calendar-view';

const meta: Meta<typeof CalendarControls> = {
  title: 'Bookings/CalendarControls',
  component: CalendarControls,
  parameters: {
    layout: 'padded',
  },
  args: {
    onRoomSelect: fn(),
    onShowMineChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CalendarControls>;

/** No room picked: only the user's own bookings can be shown, so "Show mine" is locked on */
export const NoRoom: Story = {
  args: {
    room: null,
    showMine: true,
    showMineLocked: true,
  },
};

/** A room is picked and the user's bookings are overlaid on its schedule */
export const RoomWithMine: Story = {
  args: {
    room: 'ASTAIRE',
    showMine: true,
    showMineLocked: false,
  },
};

/** A room is picked and the user has hidden their own bookings */
export const RoomOnly: Story = {
  args: {
    room: 'ASTAIRE',
    showMine: false,
    showMineLocked: false,
  },
};

function InteractiveControls() {
  const { room, showMine, showMineLocked, selectRoom, setShowMine } = useCalendarView();
  return (
    <CalendarControls
      room={room}
      showMine={showMine}
      showMineLocked={showMineLocked}
      onRoomSelect={selectRoom}
      onShowMineChange={setShowMine}
    />
  );
}

/** Wired to useCalendarView, so selecting, deselecting and toggling behave as on the page */
export const Interactive: Story = {
  render: () => <InteractiveControls />,
};
