import { act, renderHook } from '@testing-library/react';
import type { CalendarController } from '@fullcalendar/react';
import type { BookingPreview } from '@/components/bookings/CreateBookingForm';
import { PREVIEW_EVENT_ID, suggestedDay, useNewBooking } from '@/hooks/use-new-booking';
import type { BookingView, Room } from '@/lib/types/booking';

// Wednesday 18 November 2026, 08:20.
const now = new Date(2026, 10, 18, 8, 20);
const week = { start: new Date(2026, 10, 16), end: new Date(2026, 10, 23) };

function setup(overrides: { room?: Room | null; sidePanel?: boolean } = {}) {
  const controller = {
    view: { type: 'timeGridWeek' },
    changeView: jest.fn(),
    gotoDate: jest.fn(),
  } as unknown as CalendarController;
  const showRoom = jest.fn();
  const refresh = jest.fn().mockResolvedValue(undefined);
  const schedules = {
    ASTAIRE: [{ uid: 'a1' }],
    BUSSELL: [],
    ALEX_MOORE: [],
    FOSSE: [{ uid: 'f1' }],
  } as unknown as Record<Room, BookingView[]>;
  const hook = renderHook(
    ({ sidePanel }) =>
      useNewBooking({
        controller,
        room: overrides.room === undefined ? 'FOSSE' : overrides.room,
        range: week,
        showRoom,
        schedules,
        refresh,
        sidePanel,
      }),
    { initialProps: { sidePanel: overrides.sidePanel ?? true } }
  );
  return { ...hook, controller, showRoom, refresh, schedules };
}

const preview: BookingPreview = {
  room: 'FOSSE',
  date: new Date(2026, 10, 19),
  start: 13 * 60,
  end: 14 * 60 + 30,
  classType: 'GROUP',
  isShareable: true,
};

beforeEach(() => {
  jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('suggestedDay', () => {
  it('is today when today is on screen, or the screen shows the past', () => {
    expect(suggestedDay(week, now)).toBe(now);
    expect(suggestedDay({ start: new Date(2026, 10, 9), end: new Date(2026, 10, 16) }, now)).toBe(
      now
    );
  });

  it('is the first day shown for a future week', () => {
    const next = { start: new Date(2026, 10, 23), end: new Date(2026, 10, 30) };
    expect(suggestedDay(next, now)).toBe(next.start);
  });
});

describe('useNewBooking', () => {
  it('opens on the selected room and suggested day, and closes back to the earlier view', () => {
    const { result, controller } = setup();

    act(() => result.current.openNew());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.draft).toEqual({ room: 'FOSSE', day: now });

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(controller.changeView).toHaveBeenCalledWith('timeGridWeek');
  });

  it('follows the form: shows its room, and its day in day view', () => {
    const { result, controller, showRoom } = setup();
    act(() => result.current.openNew());

    act(() => result.current.handlePreviewChange(preview));

    expect(showRoom).toHaveBeenCalledWith('FOSSE');
    expect(controller.changeView).toHaveBeenCalledWith('timeGridDay');
    expect(controller.gotoDate).toHaveBeenCalledWith(new Date(2026, 10, 19).getTime());
  });

  it('shows the form’s booking as a draggable placeholder', () => {
    const { result } = setup();
    act(() => result.current.openNew());
    act(() => result.current.handlePreviewChange(preview));

    expect(result.current.previewEvent).toMatchObject({
      id: PREVIEW_EVENT_ID,
      start: new Date(2026, 10, 19, 13, 0),
      end: new Date(2026, 10, 19, 14, 30),
      editable: true,
    });
  });

  it('names the placeholder by its class type once one is chosen', () => {
    const { result } = setup();
    act(() => result.current.openNew());

    act(() => result.current.handlePreviewChange({ ...preview, classType: undefined }));
    expect(result.current.previewEvent?.extendedProps).toMatchObject({ heading: 'New booking' });

    act(() => result.current.handlePreviewChange(preview));
    expect(result.current.previewEvent?.extendedProps).toMatchObject({
      heading: 'Group',
      detail: 'Fosse',
    });
  });

  it('moves the form’s time when the placeholder is dragged, and ignores other events', () => {
    const { result } = setup();
    act(() => result.current.openNew());
    act(() => result.current.handlePreviewChange(preview));

    act(() => result.current.movePreview({ id: 'other', start: new Date(), end: new Date() }));
    expect(result.current.draft).toEqual({ room: 'FOSSE', day: now });

    const start = new Date(2026, 10, 19, 15, 0);
    const end = new Date(2026, 10, 19, 16, 0);
    act(() => result.current.movePreview({ id: PREVIEW_EVENT_ID, start, end }));
    expect(result.current.draft).toEqual({ room: 'FOSSE', start, end });
  });

  it('hands the form the calendar’s bookings for its room, once its day is loaded', () => {
    const { result, schedules } = setup();
    act(() => result.current.openNew());
    expect(result.current.schedule).toBeNull();

    act(() => result.current.handlePreviewChange(preview));
    expect(result.current.schedule).toBe(schedules.FOSSE);

    act(() => result.current.handlePreviewChange({ ...preview, date: new Date(2026, 10, 30) }));
    expect(result.current.schedule).toBeNull();
  });

  it('won’t close while a booking is being sent', () => {
    const { result, controller } = setup();
    act(() => result.current.openNew());

    act(() => result.current.handleSubmittingChange(true));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(true);
    expect(controller.changeView).not.toHaveBeenCalled();

    act(() => result.current.handleBooked({ uid: 'new' } as BookingView));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('shows the confirmation after booking and refreshes the calendar', () => {
    const { result, refresh } = setup();
    act(() => result.current.openNew());
    act(() => result.current.handlePreviewChange(preview));

    const saved = { uid: 'new' } as BookingView;
    act(() => result.current.handleBooked(saved));

    expect(result.current.confirmed).toBe(saved);
    expect(result.current.previewEvent).toBeNull();
    expect(refresh).toHaveBeenCalled();
  });

  it('starts the next booking when a range is picked from the confirmation', () => {
    const { result } = setup();
    act(() => result.current.openNew());
    act(() => result.current.handleBooked({ uid: 'new' } as BookingView));

    const span = { start: new Date(2026, 10, 20, 10), end: new Date(2026, 10, 20, 11) };
    act(() => result.current.select(span as never));

    expect(result.current.confirmed).toBeNull();
    expect(result.current.draft).toEqual({ room: 'FOSSE', ...span });
  });

  it('keeps the form’s choices when it moves between the panel and the dialog', () => {
    const { result, rerender } = setup();
    act(() => result.current.openNew());
    act(() => result.current.handlePreviewChange(preview));

    rerender({ sidePanel: false });

    expect(result.current.draft).toEqual({
      room: 'FOSSE',
      classType: 'GROUP',
      isShareable: true,
      start: new Date(2026, 10, 19, 13, 0),
      end: new Date(2026, 10, 19, 14, 30),
    });
  });

  it('books the room picked in the filters while the form is open', () => {
    const { result } = setup();
    act(() => result.current.openNew());

    act(() => result.current.chooseRoom('ASTAIRE'));

    expect(result.current.draft).toEqual({ room: 'ASTAIRE' });
  });
});
