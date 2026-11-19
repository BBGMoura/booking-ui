'use client';

import { BookingConfirmation } from '@/components/bookings/BookingConfirmation';
import { BookingSurface } from '@/components/bookings/BookingSurface';
import { CreateBookingForm } from '@/components/bookings/CreateBookingForm';
import type { useNewBooking } from '@/hooks/use-new-booking';

const BOOKING_TITLE = 'New booking';
const BOOKING_DESCRIPTION = 'Choose a room and time, then the type of class.';
const CONFIRMED_TITLE = 'Booking confirmed';
const CONFIRMED_DESCRIPTION = 'Here are the details of your booking.';

interface NewBookingPanelProps {
  booking: ReturnType<typeof useNewBooking>;
  /** A panel beside the calendar on wide screens, a dialog otherwise. */
  sidePanel: boolean;
}

/** The booking form, or its confirmation once booked, in the panel or dialog. */
export function NewBookingPanel({ booking, sidePanel }: NewBookingPanelProps) {
  const { confirmed, draft } = booking;
  return (
    <BookingSurface
      sidePanel={sidePanel}
      title={confirmed ? CONFIRMED_TITLE : BOOKING_TITLE}
      description={confirmed ? CONFIRMED_DESCRIPTION : BOOKING_DESCRIPTION}
      headerHidden={!!confirmed}
      onClose={booking.close}
      closeDisabled={booking.submitting}
    >
      {confirmed ? (
        <BookingConfirmation booking={confirmed} onDone={booking.close} />
      ) : (
        draft && (
          <CreateBookingForm
            draft={draft}
            schedule={booking.schedule}
            onPreviewChange={booking.handlePreviewChange}
            onBooked={booking.handleBooked}
            onConflict={booking.handleConflict}
            onSubmittingChange={booking.handleSubmittingChange}
          />
        )
      )}
    </BookingSurface>
  );
}
