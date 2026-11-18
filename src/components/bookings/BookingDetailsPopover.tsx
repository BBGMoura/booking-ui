import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cancelBooking, cancelBookingAsAdmin } from '@/lib/api/booking';
import { parseApiError } from '@/lib/utils/errorUtils';
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
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

function formatWhen(start: string, end: string) {
  const from = new Date(start);
  return `${dateFormat.format(from)}, ${timeFormat.format(from)}–${timeFormat.format(new Date(end))}`;
}

/**
 * Details of the clicked booking. What's shown was already decided by the role
 * rules when the event was built; this only lays it out and handles cancelling.
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

  const rows: [string, string | undefined][] = [
    ['Teacher', details.bookerName],
    ['Room', details.room && ROOM_LABELS[details.room]],
    ['When', formatWhen(details.start, details.end)],
    ['Class type', CLASS_TYPE_LABELS[details.classType]],
    ['Shareable', details.shareable ? 'Yes' : 'No'],
    ['Status', details.status && details.status.charAt(0) + details.status.slice(1).toLowerCase()],
    ['Price', details.price === undefined ? undefined : `£${details.price.toFixed(2)}`],
  ];

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
        onCloseAutoFocus={(e) => {
          // Nothing triggers this popover, so put focus back on the tile.
          e.preventDefault();
          anchor.focus();
        }}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows
            .filter((row): row is [string, string] => row[1] !== undefined)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {error && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {error}
          </p>
        )}
        {canCancel &&
          (confirming ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm">Cancel this booking? This can&apos;t be undone.</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  aria-disabled={cancelling}
                  onClick={confirmCancel}
                  autoFocus
                >
                  Yes, cancel booking
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled={cancelling}
                  onClick={() => setConfirming(false)}
                >
                  Keep booking
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="mt-4"
              onClick={() => setConfirming(true)}
            >
              Cancel booking
            </Button>
          ))}
      </PopoverContent>
    </Popover>
  );
}
