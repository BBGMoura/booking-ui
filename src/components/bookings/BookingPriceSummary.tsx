import { formatDuration, formatPrice } from '@/lib/utils/bookingTime';

interface BookingPriceSummaryProps {
  /** The booking's length, or null until it has a valid time. */
  minutes: number | null;
  /** The chosen class type's price, or null until it has loaded. */
  pricePerHour: number | null;
}

/** The estimated price of the booking as it stands in the form. */
export function BookingPriceSummary({ minutes, pricePerHour }: BookingPriceSummaryProps) {
  const total = minutes !== null && pricePerHour !== null ? (pricePerHour * minutes) / 60 : null;
  return (
    <div
      className="bg-muted/50 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="font-medium">Estimated price</p>
        <p className="text-muted-foreground">
          {minutes === null
            ? 'Choose a time to see the price.'
            : pricePerHour === null
              ? `${formatDuration(minutes)} · choose a class type`
              : `${formatDuration(minutes)} at ${formatPrice(pricePerHour)}/hr`}
        </p>
      </div>
      <p className="text-base font-semibold tabular-nums">
        {total === null ? '—' : formatPrice(total)}
      </p>
    </div>
  );
}
