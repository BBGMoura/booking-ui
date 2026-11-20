'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { BookingClassFields } from '@/components/bookings/BookingClassFields';
import { BookingNotice, type Notice } from '@/components/bookings/BookingNotice';
import { BookingPriceSummary } from '@/components/bookings/BookingPriceSummary';
import { BookingTimeFields } from '@/components/bookings/BookingTimeFields';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useBookingAvailability } from '@/hooks/use-booking-availability';
import { useBookingFormData } from '@/hooks/use-booking-form-data';
import { createBooking } from '@/lib/api/booking';
import type { BookingView } from '@/lib/types/booking';
import {
  type BookingDraft,
  type BookingFormValues,
  type BookingPreview,
  bookingSchema,
  draftValues,
} from '@/lib/utils/bookingForm';
import { HIGH_DEMAND_MESSAGE } from '@/lib/utils/bookingMessages';
import { atMinutes, toOffsetDateTime } from '@/lib/utils/bookingTime';
import {
  getApiErrorInfo,
  isFieldValidationError,
  parseApiError,
  setFieldErrors,
} from '@/lib/utils/errorUtils';

interface CreateBookingFormProps {
  /**
   * Fills the form when it opens. Passing a new object later moves the room
   * and time to it (when a range is picked or the preview is dragged on the
   * calendar) and keeps everything else the user has chosen.
   */
  draft: BookingDraft;
  /**
   * The chosen room's bookings around the chosen day, to say which ones are in
   * the way when the backend reports a clash; null while they're loading. The
   * calendar loads them anyway, so the form doesn't fetch its own copy.
   */
  schedule: BookingView[] | null;
  /** Called whenever any choice changes. */
  onPreviewChange?: (preview: BookingPreview) => void;
  /** The booking was created; `booking` is what the backend saved. */
  onBooked: (booking: BookingView) => void;
  /**
   * The backend refused the time because it clashes with another booking, so
   * `schedule` is out of date and should be reloaded. The form stays open and
   * shows the error.
   */
  onConflict: () => void;
  /**
   * Whether a booking is being sent. The surface around the form shouldn't
   * close meanwhile: the booking would still be made, unseen.
   */
  onSubmittingChange?: (submitting: boolean) => void;
}

/**
 * Books a room. Opened from a range picked on the calendar (which fills in the
 * room and time) or from the "New booking" button; everything can be changed
 * here. It asks the backend whether the booking would be accepted as the
 * choices change, so most conflicts show before submitting. Mount it only
 * while it's open: it loads its options on mount.
 */
export function CreateBookingForm({
  draft,
  schedule,
  onPreviewChange,
  onBooked,
  onConflict,
  onSubmittingChange,
}: CreateBookingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    onSubmittingChange?.(isLoading);
  }, [isLoading, onSubmittingChange]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onTouched',
    defaultValues: { isShareable: false, ...draftValues(draft) },
  });
  const [room, date, start, end, classType, isShareable] = form.watch([
    'room',
    'date',
    'start',
    'end',
    'classType',
    'isShareable',
  ]);
  const { classTypes, classTypesFailed, pricePerHour } = useBookingFormData(classType);

  // A new draft after mount moves the room and time; the rest stays as chosen.
  const appliedDraft = useRef(draft);
  useEffect(() => {
    if (appliedDraft.current === draft) return;
    appliedDraft.current = draft;
    const options = { shouldValidate: form.formState.isSubmitted };
    for (const [name, value] of Object.entries(draftValues(draft, true))) {
      form.setValue(name as keyof BookingFormValues, value as never, options);
    }
  }, [draft, form]);

  const choiceKey = `${room}|${date?.getTime()}|${start}|${end}|${classType}|${isShareable}`;

  // A failed booking's error is about the choices it was made with, so it
  // clears as soon as any of them changes. (A clash is tracked by
  // `useBookingAvailability`.)
  useEffect(() => {
    form.clearErrors('root');
  }, [choiceKey, form]);

  useEffect(() => {
    onPreviewChange?.({
      room,
      date,
      start: start ?? undefined,
      end: end ?? undefined,
      classType,
      isShareable,
    });
    // `date` is compared by value: the form hands out a new Date only when it changes.
  }, [onPreviewChange, room, date, start, end, classType, isShareable]);

  const availability = useBookingAvailability({
    room,
    date,
    start,
    end,
    classType,
    isShareable,
    schedule,
    choiceKey,
  });
  const { reject } = availability;
  const rootError =
    form.formState.errors.root?.message ??
    (classTypesFailed ? 'Could not load the class types. Please close this and try again.' : null);
  const notice: Notice = rootError ? { tone: 'error', message: rootError } : availability.notice;

  async function onSubmit(values: BookingFormValues) {
    setIsLoading(true);
    try {
      const booking = await createBooking({
        room: values.room,
        classType: values.classType,
        isShareable: values.isShareable,
        // The schema rejects a missing time, so both are set here.
        dateFrom: toOffsetDateTime(atMinutes(values.date, values.start!)),
        dateTo: toOffsetDateTime(atMinutes(values.date, values.end!)),
      });
      onBooked(booking);
      return;
    } catch (exception) {
      const { status, code } = getApiErrorInfo(exception);
      if (status === 400 && (code === 'BOOKING_CONFLICT' || code === 'BOOKING_SHAREABLE_LIMIT')) {
        // Show it beside the button rather than in a toast and keep everything
        // the user entered. Once the caller reloads the schedule, the error
        // can say what's in the way.
        reject(code);
        onConflict();
      } else if (status === 503 && code === 'BOOKING_LOCK_TIMEOUT') {
        form.setError('root', { message: HIGH_DEMAND_MESSAGE });
      } else if (isFieldValidationError(exception)) {
        setFieldErrors(exception.response!.data.details, form.setError, ['room', 'classType']);
      } else {
        form.setError('root', { message: parseApiError(exception) });
      }
    }
    setIsLoading(false);
  }

  const hasTime = !!date && start != null && end != null && end > start;
  const minutes = hasTime ? end - start : null;

  return (
    // Only the fields scroll: the notice and the button stay in view below
    // them. The surface around the form must be a flex column with a bounded
    // height for this to work.
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      {/* Bleeds into the surface's side padding so the scrollbar sits at its
          edge and focus rings aren't clipped. */}
      <div className="-mx-6 min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-1">
        <FieldGroup className="gap-4">
          <BookingTimeFields form={form} disabled={isLoading} />
          <BookingClassFields control={form.control} classTypes={classTypes} disabled={isLoading} />
        </FieldGroup>

        <BookingPriceSummary minutes={minutes} pricePerHour={pricePerHour} />
      </div>

      <div className="-mx-6 mt-4 space-y-3 border-t px-6 pt-4">
        <BookingNotice notice={notice} />
        <Button type="submit" className="w-full" disabled={isLoading || !classTypes}>
          {isLoading ? (
            <>
              <Spinner />
              Booking…
            </>
          ) : (
            'Book room'
          )}
        </Button>
      </div>
    </form>
  );
}
