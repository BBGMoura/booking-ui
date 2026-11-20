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
    expect(screen.getByRole('button', { name: 'Show my bookings' })).toBeInTheDocument();
  });

  it('disables the overlay toggle while locked', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Show my bookings' })).toBeDisabled();
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
    await userEvent.click(screen.getByRole('button', { name: 'Show my bookings' }));
    expect(onShowMineChange).toHaveBeenCalledWith(false);
  });
});
