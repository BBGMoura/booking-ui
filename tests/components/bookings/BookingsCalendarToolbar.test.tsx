import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CalendarController } from '@fullcalendar/react';
import { BookingsCalendarToolbar } from '@/components/bookings/BookingsCalendarToolbar';

const VIEWS = ['timeGridWeek', 'timeGridDay'];

const mockController = (viewType = 'timeGridWeek') => {
  const controller = {
    view: { title: 'November 2026', type: viewType },
    getButtonState: () => ({
      today: { text: 'Today', hint: 'This week', isDisabled: false },
      prev: { text: 'Prev', hint: 'Previous week', isDisabled: false },
      next: { text: 'Next', hint: 'Next week', isDisabled: true },
      timeGridWeek: { text: 'Week', hint: 'Week view', isDisabled: false },
      timeGridDay: { text: 'Day', hint: 'Day view', isDisabled: false },
    }),
    today: jest.fn(),
    prev: jest.fn(),
    next: jest.fn(),
    changeView: jest.fn(),
  };
  return controller as typeof controller & CalendarController;
};

describe('BookingsCalendarToolbar', () => {
  it('shows the current view title', () => {
    render(<BookingsCalendarToolbar controller={mockController()} availableViews={VIEWS} />);
    expect(screen.getByText('November 2026')).toBeInTheDocument();
  });

  it('navigates with the today, previous and next buttons', async () => {
    const controller = mockController();
    render(<BookingsCalendarToolbar controller={controller} availableViews={VIEWS} />);
    await userEvent.click(screen.getByRole('button', { name: 'This week' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(controller.today).toHaveBeenCalled();
    expect(controller.prev).toHaveBeenCalled();
  });

  it('disables a navigation button the calendar reports as disabled', () => {
    render(<BookingsCalendarToolbar controller={mockController()} availableViews={VIEWS} />);
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  });

  it('offers only the available views and marks the current one', async () => {
    const controller = mockController('timeGridDay');
    render(<BookingsCalendarToolbar controller={controller} availableViews={VIEWS} />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Day view' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Week view' }));
    expect(controller.changeView).toHaveBeenCalledWith('timeGridWeek');
  });
});
