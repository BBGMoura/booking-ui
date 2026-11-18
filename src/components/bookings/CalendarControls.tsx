'use client';

import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ROOMS, type Room } from '@/lib/types/booking';

const ROOM_LABELS: Record<Room, string> = {
  ASTAIRE: 'Astaire',
  BUSSELL: 'Bussell',
  ALEX_MOORE: 'Alex Moore',
  FOSSE: 'Fosse',
};

interface CalendarControlsProps {
  room: Room | null;
  showMine: boolean;
  showMineLocked: boolean;
  onRoomSelect: (room: Room) => void;
  onShowMineChange: (showMine: boolean) => void;
}

export function CalendarControls({
  room,
  showMine,
  showMineLocked,
  onRoomSelect,
  onShowMineChange,
}: CalendarControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        value={room ?? ''}
        // Radix reports '' when the selected item is clicked again; the hook
        // handles the deselect, so only forward actual room clicks.
        onValueChange={(value) => {
          const clicked = (value || room) as Room | null;
          if (clicked) onRoomSelect(clicked);
        }}
        aria-label="Room"
      >
        {Object.values(ROOMS).map((r) => (
          <ToggleGroupItem key={r} value={r}>
            {ROOM_LABELS[r]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Toggle
        variant="outline"
        pressed={showMine}
        disabled={showMineLocked}
        onPressedChange={onShowMineChange}
        aria-label="Show mine"
      >
        Show mine
      </Toggle>
    </div>
  );
}
