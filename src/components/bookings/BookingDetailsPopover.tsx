import { useState } from 'react';
import {
  CircleCheck,
  CircleX,
  PoundSterling,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cancelBooking, cancelBookingAsAdmin } from '@/lib/api/booking';
import { parseApiError } from '@/lib/utils/errorUtils';
import type { BookingStatus } from '@/lib/types/booking';
import { CLASS_TYPE_LABELS, ROOM_LABELS, type BookingDetails } from '@/lib/utils/calendarEvents';

interface BookingDetailsPopoverProps {
  details: BookingDetails;
  /** The tile that was clicked; the popover opens next to it. */
  anchor: HTMLElement;
  isAdmin: boolean;
  onClose: () => void;
  onCancelled: (uid: string) => void;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

function formatWhen(start: string, end: string) {
  const from = new Date(start);
  return `${dateFormat.format(from)} · ${timeFormat.format(from)}–${timeFormat.format(new Date(end))}`;
}

const STATUS_META: Partial<Record<BookingStatus, { label: string; icon: LucideIcon }>> = {
  CANCELLED: { label: 'Cancelled', icon: CircleX },
  COMPLETED: { label: 'Completed', icon: CircleCheck },
};

/**
 * A small card with more about the clicked booking. What's shown was already
 * decided by the role rules when the event was built; this only lays it out
 * and handles cancelling.
 *
 * It's meant to read as a quiet "more info" card, not a form: only facts worth
 * noticing get a line (a name, shareable, a non-zero price, a status other than
 * the usual "booked"), and cancelling stays a muted action until it's confirmed.
 *
 * Cancelling needs a second click because it can't be undone. The confirmation
 * is inline rather than a separate dialog so Escape and focus keep working
 * the same way throughout.
 */
export function BookingDetailsPopover({
  details,
  anchor,
  isAdmin,
  onClose,
  onCancelled,
}: BookingDetailsPopoverProps) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bookings that have started can't be cancelled.
  const canCancel = details.cancellable && new Date(details.start).getTime() > Date.now();

  const title = [CLASS_TYPE_LABELS[details.classType], details.room && ROOM_LABELS[details.room]]
    .filter(Boolean)
    .join(' · ');
  const status = details.status && STATUS_META[details.status];
  const facts: { key: string; icon: LucideIcon; text: string; srLabel?: string }[] = [];
  if (details.bookerName)
    facts.push({ key: 'name', icon: User, text: details.bookerName, srLabel: 'Booked by' });
  if (details.shareable) facts.push({ key: 'shareable', icon: Users, text: 'Shareable' });
  if (details.price)
    facts.push({
      key: 'price',
      icon: PoundSterling,
      text: details.price.toFixed(2),
      srLabel: 'Price £',
    });
  if (status) facts.push({ key: 'status', icon: status.icon, text: status.label });

  async function confirmCancel() {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await (isAdmin ? cancelBookingAsAdmin(details.uid) : cancelBooking(details.uid));
      onCancelled(details.uid);
      onClose();
    } catch (e) {
      setError(parseApiError(e));
      setCancelling(false);
    }
  }

  return (
    <Popover open onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor virtualRef={{ current: anchor }} />
      <PopoverContent
        aria-label="Booking details"
        className="w-64 p-3"
        tabIndex={-1}
        onOpenAutoFocus={(e) => {
          // By default the first button (Cancel) takes focus and shows a focus
          // ring, so opening the card looks like it's offering to cancel.
          e.preventDefault();
          (e.target as HTMLElement).focus();
        }}
        onCloseAutoFocus={(e) => {
          // Nothing triggers this popover, so put focus back on the tile.
          e.preventDefault();
          anchor.focus();
        }}
      >
        <p className="text-sm leading-snug font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatWhen(details.start, details.end)}
        </p>
        {facts.length > 0 && (
          <ul className="text-muted-foreground mt-2.5 space-y-1 text-xs">
            {facts.map(({ key, icon: Icon, text, srLabel }) => (
              <li key={key} className="flex items-center gap-2">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="text-foreground/90 truncate">
                  {srLabel && <span className="sr-only">{srLabel} </span>}
                  {text}
                </span>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-destructive mt-2.5 text-xs">
            {error}
          </p>
        )}
        {canCancel && (
          <div className="mt-3 border-t pt-2">
            {confirming ? (
              <div className="space-y-2">
                <p className="text-xs">Cancel this booking? This can&apos;t be undone.</p>
                <div className="flex justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-disabled={cancelling}
                    onClick={() => setConfirming(false)}
                  >
                    Keep
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    aria-disabled={cancelling}
                    onClick={confirmCancel}
                    autoFocus
                  >
                    Yes, cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground hover:text-destructive"
                  // "Cancel" alone could read as "close this" to a screen reader.
                  aria-label="Cancel booking"
                  onClick={() => setConfirming(true)}
                >
                  <Trash2 aria-hidden />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
