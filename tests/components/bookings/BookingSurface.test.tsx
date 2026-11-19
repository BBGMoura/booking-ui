import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingSurface } from '@/components/bookings/BookingSurface';

function renderPanel(onClose = jest.fn()) {
  const view = render(
    <>
      <button>Opener</button>
      <BookingSurface sidePanel title="New booking" description="Choose a room" onClose={onClose}>
        <input aria-label="Field" />
      </BookingSurface>
    </>
  );
  return { ...view, onClose };
}

describe('BookingSurface', () => {
  it('moves focus into the side panel when it opens and back when it closes', () => {
    const opener = render(<button>Opener</button>).getByRole('button');
    opener.focus();
    const { unmount } = render(
      <BookingSurface sidePanel title="New booking" description="d" onClose={jest.fn()}>
        <input aria-label="Field" />
      </BookingSurface>
    );

    expect(screen.getByRole('heading', { name: 'New booking' })).toHaveFocus();
    unmount();
    expect(opener).toHaveFocus();
  });

  it('closes the side panel on Escape from inside it', async () => {
    const { onClose } = renderPanel();
    await userEvent.click(screen.getByRole('textbox', { name: 'Field' }));
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('ignores Escape pressed outside the side panel', async () => {
    const { onClose } = renderPanel();
    screen.getByRole('button', { name: 'Opener' }).focus();
    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from its close button', async () => {
    const { onClose } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows a dialog when there is no room for the panel', () => {
    render(
      <BookingSurface sidePanel={false} title="New booking" description="d" onClose={jest.fn()}>
        <input aria-label="Field" />
      </BookingSurface>
    );

    expect(screen.getByRole('dialog', { name: 'New booking' })).toBeInTheDocument();
  });
});
