import { act, renderHook } from '@testing-library/react';
import type { CalendarController } from '@fullcalendar/react';
import { useResponsiveCalendarView } from '@/hooks/use-responsive-calendar-view';

let matches = false;
const listeners = new Set<() => void>();

function setMobile(value: boolean) {
  matches = value;
  act(() => listeners.forEach((listener) => listener()));
}

beforeEach(() => {
  matches = false;
  listeners.clear();
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
});

const makeController = () => ({ changeView: jest.fn() }) as unknown as CalendarController;

describe('useResponsiveCalendarView', () => {
  it('starts on the week view on wide screens', () => {
    const controller = makeController();
    const { result } = renderHook(() => useResponsiveCalendarView(controller));
    expect(result.current.isMobile).toBe(false);
    expect(result.current.initialView).toBe('timeGridWeek');
    expect(controller.changeView).not.toHaveBeenCalled();
  });

  it('starts on the day view on narrow screens', () => {
    matches = true;
    const controller = makeController();
    const { result } = renderHook(() => useResponsiveCalendarView(controller));
    expect(result.current.isMobile).toBe(true);
    expect(result.current.initialView).toBe('timeGridDay');
    expect(controller.changeView).not.toHaveBeenCalled();
  });

  it('switches to the day view when the screen becomes narrow, and back', () => {
    const controller = makeController();
    renderHook(() => useResponsiveCalendarView(controller));
    setMobile(true);
    expect(controller.changeView).toHaveBeenLastCalledWith('timeGridDay');
    setMobile(false);
    expect(controller.changeView).toHaveBeenLastCalledWith('timeGridWeek');
    expect(controller.changeView).toHaveBeenCalledTimes(2);
  });
});
