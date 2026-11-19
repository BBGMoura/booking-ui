import { useCallback, useState } from 'react';
import type { BookingDetails } from '@/lib/utils/calendarEvents';

export interface SelectedBooking {
  details: BookingDetails;
  /** The clicked tile, which the details card opens next to. */
  anchor: HTMLElement;
}

/** Which booking's details card is open, if any. */
export function useBookingDetails() {
  const [selected, setSelected] = useState<SelectedBooking | null>(null);
  const open = useCallback(
    (details: BookingDetails, anchor: HTMLElement) => setSelected({ details, anchor }),
    []
  );
  const close = useCallback(() => setSelected(null), []);
  return { selected, open, close };
}
