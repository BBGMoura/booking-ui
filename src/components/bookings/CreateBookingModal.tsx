'use client';

import { z } from 'zod';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { AlertCircleIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { createBooking } from '@/lib/api/booking';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';
import { CLASS_TYPES, type ClassType, type Room } from '@/lib/types/booking';
import {
  durationInHours,
  formatPrice,
  toOffsetDateTime,
  validateBookingTime,
} from '@/lib/utils/bookingTime';
import { CLASS_TYPE_LABELS, ROOM_LABELS } from '@/lib/utils/calendarEvents';
import {
  getApiErrorInfo,
  isFieldValidationError,
  parseApiError,
  setFieldErrors,
} from '@/lib/utils/errorUtils';

export const SLOT_TAKEN_MESSAGE = 'That slot was just booked. Please choose another.';
export const SHAREABLE_FULL_MESSAGE = 'That shareable class is full. Please choose another slot.';
export const HIGH_DEMAND_MESSAGE = 'We are experiencing high demand. Please try again.';

const bookingSchema = z.object({
  classType: z.enum(Object.values(CLASS_TYPES) as [ClassType, ...ClassType[]], {
    error: 'Select a class type',
  }),
  isShareable: z.boolean(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface CreateBookingModalProps {
  room: Room;
  start: Date;
  end: Date;
  /** Closes the modal without booking. */
  onClose: () => void;
  /** The booking was created. */
  onBooked: () => void;
  /** The slot can't be booked any more (taken, or a full shareable class). */
  onSlotUnavailable: (message: string) => void;
}

/**
 * Books the room and time range picked on the calendar. The room and time are
 * fixed; the user chooses the class type and whether it's shareable. Mount it
 * only while a range is selected: it loads its options on mount.
 */
export function CreateBookingModal({
  room,
  start,
  end,
  onClose,
  onBooked,
  onSlotUnavailable,
}: CreateBookingModalProps) {
  const [classTypes, setClassTypes] = useState<ClassType[] | null>(null);
  const [classTypesFailed, setClassTypesFailed] = useState(false);
  const [pricePerHour, setPricePerHour] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { classType: undefined, isShareable: false },
  });
  const classType = form.watch('classType');
  const timeError = validateBookingTime(start, end);

  useEffect(() => {
    let current = true;
    getClassTypes()
      .then((types) => {
        if (current) setClassTypes(types);
      })
      .catch(() => {
        if (current) setClassTypesFailed(true);
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!classType) return;
    let current = true;
    getDanceClass(classType)
      .then((danceClass) => {
        if (current) setPricePerHour(danceClass.pricePerHour);
      })
      .catch(() => {
        if (current) setPricePerHour(null);
      });
    return () => {
      current = false;
    };
  }, [classType]);

  async function onSubmit(values: BookingFormValues) {
    // The grid should never produce an invalid range, but check again here so
    // a request that's certain to fail never reaches the backend.
    if (timeError) {
      form.setError('root', { message: timeError });
      return;
    }

    setIsLoading(true);
    try {
      await createBooking({
        room,
        classType: values.classType,
        isShareable: values.isShareable,
        dateFrom: toOffsetDateTime(start),
        dateTo: toOffsetDateTime(end),
      });
      onBooked();
      return;
    } catch (exception) {
      const { status, code } = getApiErrorInfo(exception);
      if (status === 400 && code === 'BOOKING_CONFLICT') {
        onSlotUnavailable(SLOT_TAKEN_MESSAGE);
        return;
      }
      if (status === 400 && code === 'BOOKING_SHAREABLE_LIMIT') {
        onSlotUnavailable(SHAREABLE_FULL_MESSAGE);
        return;
      }
      if (status === 503 && code === 'BOOKING_LOCK_TIMEOUT') {
        form.setError('root', { message: HIGH_DEMAND_MESSAGE });
      } else if (isFieldValidationError(exception)) {
        setFieldErrors(exception.response!.data.details, form.setError, ['classType']);
      } else {
        form.setError('root', { message: parseApiError(exception) });
      }
    }
    setIsLoading(false);
  }

  const price = pricePerHour === null ? null : pricePerHour * durationInHours(start, end);

  return (
    <Dialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {ROOM_LABELS[room]}</DialogTitle>
          <DialogDescription>
            {format(start, 'EEEE d MMMM')}, {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {(form.formState.errors.root || timeError || classTypesFailed) && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root?.message ??
                  timeError ??
                  'Could not load the class types. Please close this and try again.'}
              </AlertDescription>
            </Alert>
          )}

          <Controller
            name="classType"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Class type</FieldLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={isLoading || !classTypes}
                >
                  <SelectTrigger
                    id={field.name}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder={classTypes ? 'Select a class type' : 'Loading…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(classTypes ?? []).map((type) => (
                      <SelectItem key={type} value={type}>
                        {CLASS_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="isShareable"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch
                  id={field.name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
                <FieldLabel htmlFor={field.name}>Shareable</FieldLabel>
              </Field>
            )}
          />

          <p className="text-sm" aria-live="polite">
            <span className="text-muted-foreground">Estimated price: </span>
            <span className="font-medium">{price === null ? '—' : formatPrice(price)}</span>
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !!timeError || !classTypes}>
              {isLoading ? (
                <>
                  <Spinner />
                  Booking...
                </>
              ) : (
                'Book'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
