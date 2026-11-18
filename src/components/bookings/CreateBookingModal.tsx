'use client';

import { z } from 'zod';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { AlertCircleIcon, CalendarIcon } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { CLASS_TYPES, ROOMS, type ClassType, type Room } from '@/lib/types/booking';
import {
  atMinutes,
  defaultBookingSlot,
  endTimeOptions,
  formatDuration,
  formatPrice,
  minutesOfDay,
  startTimeOptions,
  toOffsetDateTime,
  validateBookingTime,
} from '@/lib/utils/bookingTime';
import { CLASS_TYPE_LABELS, ROOM_LABELS } from '@/lib/utils/calendarEvents';
import { toTime } from '@/lib/utils/calendarUtils';
import {
  getApiErrorInfo,
  isFieldValidationError,
  parseApiError,
  setFieldErrors,
} from '@/lib/utils/errorUtils';

export const SLOT_TAKEN_MESSAGE = 'That slot was just booked. Please choose another.';
export const SHAREABLE_FULL_MESSAGE = 'That shareable class is full. Please choose another slot.';
export const HIGH_DEMAND_MESSAGE = 'We are experiencing high demand. Please try again.';

const bookingSchema = z
  .object({
    room: z.enum(Object.values(ROOMS) as [Room, ...Room[]], { error: 'Choose a room' }),
    date: z.date({ error: 'Choose a date' }),
    start: z.number({ error: 'Choose a start time' }),
    end: z.number({ error: 'Choose an end time' }),
    classType: z.enum(Object.values(CLASS_TYPES) as [ClassType, ...ClassType[]], {
      error: 'Choose a class type',
    }),
    isShareable: z.boolean(),
  })
  .superRefine(({ date, start, end }, ctx) => {
    const message = validateBookingTime(atMinutes(date, start), atMinutes(date, end));
    if (message) ctx.addIssue({ code: 'custom', path: ['end'], message });
  });

type BookingFormValues = z.infer<typeof bookingSchema>;

// Clears a time select. Not undefined, which Controller would read as "use the
// default value". The schema rejects it like any other missing value.
const NO_TIME = null as unknown as number;

/** What the form starts with. Anything left out is chosen in the form. */
export interface BookingDraft {
  room?: Room;
  /** A dragged range; without one the form suggests a slot on `day`. */
  start?: Date;
  end?: Date;
  /** The day to suggest a slot on when there's no dragged range. Defaults to today. */
  day?: Date;
}

interface CreateBookingModalProps {
  draft: BookingDraft;
  /** Closes the modal without booking. */
  onClose: () => void;
  /** The booking was created. */
  onBooked: () => void;
  /** The slot can't be booked any more (taken, or a full shareable class). */
  onSlotUnavailable: (message: string) => void;
}

function initialValues(draft: BookingDraft): Partial<BookingFormValues> {
  if (draft.start && draft.end) {
    return {
      room: draft.room,
      date: draft.start,
      start: minutesOfDay(draft.start),
      end: minutesOfDay(draft.end),
      isShareable: false,
    };
  }
  const date = draft.day ?? new Date();
  const slot = defaultBookingSlot(date, new Date());
  return { room: draft.room, date, start: slot?.start, end: slot?.end, isShareable: false };
}

/**
 * Books a room. Opened from a range dragged on the calendar (which fills in the
 * room and time) or from the "New booking" button; everything can be changed
 * here. Mount it only while it's open: it loads its options on mount.
 */
export function CreateBookingModal({
  draft,
  onClose,
  onBooked,
  onSlotUnavailable,
}: CreateBookingModalProps) {
  const [classTypes, setClassTypes] = useState<ClassType[] | null>(null);
  const [classTypesFailed, setClassTypesFailed] = useState(false);
  const [pricePerHour, setPricePerHour] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onTouched',
    defaultValues: initialValues(draft),
  });
  const [date, start, end, classType] = form.watch(['date', 'start', 'end', 'classType']);

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

  // Opening hours differ by day, so a new date can rule out the chosen times.
  function changeDate(next: Date) {
    form.setValue('date', next, { shouldValidate: true });
    if (start == null) return;
    if (!startTimeOptions(next).includes(start)) {
      form.setValue('start', NO_TIME);
      form.setValue('end', NO_TIME);
    } else if (end != null && !endTimeOptions(next, start).includes(end)) {
      form.setValue('end', NO_TIME);
    }
  }

  // Moving the start keeps the booking's length, as long as it still fits.
  function changeStart(next: number) {
    form.setValue('start', next, { shouldValidate: true });
    const ends = endTimeOptions(date, next);
    const length = start != null && end != null ? end - start : 60;
    const kept = next + length;
    form.setValue('end', ends.includes(kept) ? kept : ends[ends.length - 1], {
      shouldValidate: form.formState.isSubmitted,
    });
  }

  async function onSubmit(values: BookingFormValues) {
    setIsLoading(true);
    try {
      await createBooking({
        room: values.room,
        classType: values.classType,
        isShareable: values.isShareable,
        dateFrom: toOffsetDateTime(atMinutes(values.date, values.start)),
        dateTo: toOffsetDateTime(atMinutes(values.date, values.end)),
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
        setFieldErrors(exception.response!.data.details, form.setError, ['room', 'classType']);
      } else {
        form.setError('root', { message: parseApiError(exception) });
      }
    }
    setIsLoading(false);
  }

  const hasTime = date && start != null && end != null && end > start;
  const minutes = hasTime ? end - start : null;
  const price = minutes !== null && pricePerHour !== null ? (pricePerHour * minutes) / 60 : null;
  const startOptions = date ? startTimeOptions(date) : [];
  const endOptions = date && start != null ? endTimeOptions(date, start) : [];

  return (
    <Dialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>Choose a room and time, then the type of class.</DialogDescription>
        </DialogHeader>

        <form
          id="create-booking-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          {(form.formState.errors.root || classTypesFailed) && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Could not book</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root?.message ??
                  'Could not load the class types. Please close this and try again.'}
              </AlertDescription>
            </Alert>
          )}

          <FieldGroup className="gap-5">
            <Controller
              name="room"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="booking-room">Room</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      id="booking-room"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                      onBlur={field.onBlur}
                    >
                      <SelectValue placeholder="Choose a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ROOMS).map((room) => (
                        <SelectItem key={room} value={room}>
                          {ROOM_LABELS[room]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="booking-date">Date</FieldLabel>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="booking-date"
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                        aria-invalid={fieldState.invalid}
                        disabled={isLoading}
                      >
                        <CalendarIcon className="text-muted-foreground" />
                        {field.value ? format(field.value, 'EEEE d MMMM yyyy') : 'Choose a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        defaultMonth={field.value}
                        weekStartsOn={1}
                        disabled={{ before: startOfToday() }}
                        onSelect={(next) => {
                          if (!next) return;
                          changeDate(next);
                          setDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="start"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="booking-start">Start</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value == null ? '' : String(field.value)}
                      onValueChange={(value) => changeStart(Number(value))}
                      disabled={isLoading || !date}
                    >
                      <SelectTrigger
                        id="booking-start"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {startOptions.map((time) => (
                          <SelectItem key={time} value={String(time)}>
                            {toTime(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="end"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="booking-end">End</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value == null ? '' : String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={isLoading || start == null}
                    >
                      <SelectTrigger
                        id="booking-end"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {endOptions.map((time) => (
                          <SelectItem key={time} value={String(time)}>
                            {toTime(time)}
                            <span className="text-muted-foreground">
                              {formatDuration(time - start!)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="classType"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="booking-class-type">Class type</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isLoading || !classTypes}
                  >
                    <SelectTrigger
                      id="booking-class-type"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                      onBlur={field.onBlur}
                    >
                      <SelectValue placeholder={classTypes ? 'Choose a class type' : 'Loading…'} />
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
                  <FieldContent>
                    <FieldLabel htmlFor="booking-shareable">Shareable</FieldLabel>
                    <FieldDescription>
                      Others can book the room at the same time, up to 3 bookings at once.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="booking-shareable"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </Field>
              )}
            />
          </FieldGroup>

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
              {price === null ? '—' : formatPrice(price)}
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="create-booking-form" disabled={isLoading || !classTypes}>
            {isLoading ? (
              <>
                <Spinner />
                Booking…
              </>
            ) : (
              'Book room'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
