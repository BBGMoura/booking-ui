import { act, renderHook } from '@testing-library/react';
import { useCalendarView } from '@/hooks/use-calendar-view';

describe('useCalendarView', () => {
  it('defaults to no room with the overlay on', () => {
    const { result } = renderHook(() => useCalendarView());
    expect(result.current.room).toBeNull();
    expect(result.current.showMine).toBe(true);
    expect(result.current.showMineLocked).toBe(true);
    expect(result.current.queries).toEqual({ roomSchedule: null, myBookings: true });
  });

  it('fetches the room schedule and my bookings when a room is selected', () => {
    const { result } = renderHook(() => useCalendarView());
    act(() => result.current.selectRoom('FOSSE'));
    expect(result.current.showMineLocked).toBe(false);
    expect(result.current.queries).toEqual({ roomSchedule: 'FOSSE', myBookings: true });
  });

  it('fetches only the room schedule when the overlay is turned off', () => {
    const { result } = renderHook(() => useCalendarView());
    act(() => result.current.selectRoom('BUSSELL'));
    act(() => result.current.setShowMine(false));
    expect(result.current.queries).toEqual({ roomSchedule: 'BUSSELL', myBookings: false });
  });

  it('ignores turning the overlay off when no room is selected', () => {
    const { result } = renderHook(() => useCalendarView());
    act(() => result.current.setShowMine(false));
    expect(result.current.showMine).toBe(true);
  });

  it('forces the overlay back on when the room is deselected', () => {
    const { result } = renderHook(() => useCalendarView());
    act(() => result.current.selectRoom('ASTAIRE'));
    act(() => result.current.setShowMine(false));
    act(() => result.current.selectRoom('ASTAIRE'));
    expect(result.current.room).toBeNull();
    expect(result.current.showMine).toBe(true);
    expect(result.current.queries).toEqual({ roomSchedule: null, myBookings: true });
  });

  it('switches directly between rooms', () => {
    const { result } = renderHook(() => useCalendarView());
    act(() => result.current.selectRoom('ASTAIRE'));
    act(() => result.current.selectRoom('ALEX_MOORE'));
    expect(result.current.room).toBe('ALEX_MOORE');
  });
});
