import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Room } from '@/lib/types/booking';
import { ROOM_LABELS } from '@/lib/utils/calendarEvents';

export type Notice =
  | { tone: 'error' | 'warning'; message: string }
  | { tone: 'free'; room: Room }
  | { tone: 'checking'; room: Room }
  | null;

const NOTICE_STYLES = {
  error: 'border-destructive/40 bg-card text-destructive',
  warning:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
};

/**
 * The line above the buttons: an error once a booking has failed, a warning
 * while the backend says the time clashes (it still decides when the booking
 * is made), that it's checking, or that the room is free.
 */
export function BookingNotice({ notice }: { notice: Notice }) {
  if (!notice) return null;
  if (notice.tone === 'checking') {
    return (
      <p className="text-muted-foreground flex gap-2 text-sm">
        <Spinner className="mt-0.5 size-4 shrink-0" />
        Checking {ROOM_LABELS[notice.room]} is free…
      </p>
    );
  }
  if (notice.tone === 'free') {
    return (
      <p className="text-muted-foreground flex gap-2 text-sm">
        <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
        {ROOM_LABELS[notice.room]} is free at this time.
      </p>
    );
  }
  const Icon = notice.tone === 'error' ? CircleXIcon : TriangleAlertIcon;
  return (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2 rounded-lg border px-3 py-2 text-sm', NOTICE_STYLES[notice.tone])}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      {notice.message}
    </p>
  );
}
