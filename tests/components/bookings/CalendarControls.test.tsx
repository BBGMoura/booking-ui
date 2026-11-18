import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarControls } from '@/components/bookings/CalendarControls';

const setup = (props: Partial<React.ComponentProps<typeof CalendarControls>> = {}) => {
  const onRoomSelect = jest.fn();
  const onShowMineChange = jest.fn();
  render(
    <CalendarControls
      room={null}
      showMine
      showMineLocked
      onRoomSelect={onRoomSelect}
      onShowMineChange={onShowMineChange}
      {...props}
    />
  );
  return { onRoomSelect, onShowMineChange };
};

describe('CalendarControls', () => {
  it('renders the four rooms and the overlay toggle', () => {
    setup();
    ['Astaire', 'Bussell', 'Alex Moore', 'Fosse'].forEach((name) =>
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
    );
    expect(screen.getByRole('switch', { name: 'Show mine' })).toBeInTheDocument();
  });

  it('shows the overlay as on and disabled while locked', () => {
    setup();
    const toggle = screen.getByRole('switch', { name: 'Show mine' });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
  });

  it('selects a room on click', async () => {
    const { onRoomSelect } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Fosse' }));
    expect(onRoomSelect).toHaveBeenCalledWith('FOSSE');
  });

  it('re-clicking the selected room reports that room so it can be deselected', async () => {
    const { onRoomSelect } = setup({ room: 'FOSSE', showMineLocked: false });
    await userEvent.click(screen.getByRole('radio', { name: 'Fosse' }));
    expect(onRoomSelect).toHaveBeenCalledWith('FOSSE');
  });

  it('toggles the overlay when unlocked', async () => {
    const { onShowMineChange } = setup({ room: 'ASTAIRE', showMineLocked: false });
    await userEvent.click(screen.getByRole('switch', { name: 'Show mine' }));
    expect(onShowMineChange).toHaveBeenCalledWith(false);
  });
});
