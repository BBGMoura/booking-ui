import { useCallback, useState } from 'react';
import type { Room } from '@/lib/types/booking';

export interface CalendarQueries {
  /** Room whose full schedule should be fetched, or null to skip it. */
  roomSchedule: Room | null;
  /** Whether the current user's own bookings should be fetched. */
  myBookings: boolean;
}

export interface CalendarView {
  room: Room | null;
  showMine: boolean;
  /** True when the overlay toggle can't be switched off (no room selected). */
  showMineLocked: boolean;
  queries: CalendarQueries;
  /** Select a room; selecting the current room again deselects it. */
  selectRoom: (room: Room) => void;
  /** Show a room's schedule; unlike selectRoom, never deselects. */
  showRoom: (room: Room) => void;
  clearRoom: () => void;
  setShowMine: (showMine: boolean) => void;
}

export function useCalendarView(): CalendarView {
  const [room, setRoom] = useState<Room | null>(null);
  const [showMineChoice, setShowMineChoice] = useState(true);

  // "No room + overlay off" shows nothing, so with no room the overlay is always on.
  const showMine = room === null ? true : showMineChoice;

  const selectRoom = useCallback((next: Room) => {
    setRoom((current) => (current === next ? null : next));
  }, []);

  const showRoom = useCallback((next: Room) => setRoom(next), []);

  const clearRoom = useCallback(() => setRoom(null), []);

  const setShowMine = useCallback(
    (next: boolean) => {
      if (room === null) return;
      setShowMineChoice(next);
    },
    [room]
  );

  return {
    room,
    showMine,
    showMineLocked: room === null,
    queries: { roomSchedule: room, myBookings: showMine },
    selectRoom,
    showRoom,
    clearRoom,
    setShowMine,
  };
}
