'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ROOMS, type Room } from '@/lib/types/booking';
import { cn } from '@/lib/utils';

const ROOM_LABELS: Record<Room, string> = {
  ASTAIRE: 'Astaire',
  BUSSELL: 'Bussell',
  ALEX_MOORE: 'Alex Moore',
  FOSSE: 'Fosse',
};

interface CalendarControlsProps {
  className?: string;
  room: Room | null;
  showMine: boolean;
  showMineLocked: boolean;
  onRoomSelect: (room: Room) => void;
  onShowMineChange: (showMine: boolean) => void;
}

export function CalendarControls({
  className,
  room,
  showMine,
  showMineLocked,
  onRoomSelect,
  onShowMineChange,
}: CalendarControlsProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3', className)}>
      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        <span className="text-muted-foreground text-sm font-medium">Room</span>
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
          className="w-full sm:w-auto"
        >
          {Object.values(ROOMS).map((r) => (
            <ToggleGroupItem
              key={r}
              value={r}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-1 px-1.5 text-xs sm:flex-none sm:px-3 sm:text-sm"
            >
              {ROOM_LABELS[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="show-mine"
          checked={showMine}
          disabled={showMineLocked}
          onCheckedChange={onShowMineChange}
        />
        <Label htmlFor="show-mine" className="peer-disabled:opacity-70">
          Show mine
        </Label>
      </div>
    </div>
  );
}
