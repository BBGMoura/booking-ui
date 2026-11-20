'use client';

import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ROOMS, type Room } from '@/lib/types/booking';
import { ROOM_LABELS } from '@/lib/utils/calendarEvents';

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
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup
        type="single"
        spacing={1}
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
          <ToggleGroupItem
            key={r}
            value={r}
            className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
          >
            {ROOM_LABELS[r]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-5" />
      <Toggle
        className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
        pressed={showMine}
        disabled={showMineLocked}
        onPressedChange={onShowMineChange}
        aria-label="Show my bookings"
      >
        Mine
      </Toggle>
    </div>
  );
}
