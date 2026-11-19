'use client';

import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { CalendarIcon, CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { cn } from '@/lib/utils';
import { createBooking } from '@/lib/api/booking';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';
import {
  CLASS_TYPES,
  ROOMS,
  type BookingView,
  type ClassType,
  type Room,
} from '@/lib/types/booking';
import {
  findConflict,
  MAX_SHAREABLE_BOOKINGS,
  type BookingConflict,
} from '@/lib/utils/bookingConflicts';
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
import {
  CLASS_TYPE_LABELS,
  endOf,
  ROOM_LABELS,
  startOf,
  type BookingWithEitherDates,
} from '@/lib/utils/calendarEvents';
import { toTime } from '@/lib/utils/calendarUtils';
import {
  getApiErrorInfo,
  isFieldValidationError,
  parseApiError,
  setFieldErrors,
} from '@/lib/utils/errorUtils';

export const NOT_FREE_MESSAGE =
  'This time overlaps another booking in the room. Choose another time.';
export const SHAREABLE_FULL_MESSAGE = `This time already has ${MAX_SHAREABLE_BOOKINGS} shareable bookings. Choose another time.`;
export const HIGH_DEMAND_MESSAGE = 'We are experiencing high demand. Please try again.';

const bookingSchema = z
  .object({
    room: z.enum(Object.values(ROOMS) as [Room, ...Room[]], { error: 'Choose a room' }),
    date: z.date({ error: 'Choose a date' }),
    // Null while unchosen (a new date can clear them). Not undefined, which
    // Controller would read as "use the default value".
    start: z.number().nullable(),
    end: z.number().nullable(),
    classType: z.enum(Object.values(CLASS_TYPES) as [ClassType, ...ClassType[]], {
      error: 'Choose a class type',
    }),
    isShareable: z.boolean(),
  })
  .superRefine(({ date, start, end }, ctx) => {
    if (start === null)
      ctx.addIssue({ code: 'custom', path: ['start'], message: 'Choose a start time' });
    if (end === null)
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'Choose an end time' });
    if (start === null || end === null) return;
    const from = atMinutes(date, start);
    // The backend allows past times, but booking one is never what's meant.
    if (from < new Date()) {
      ctx.addIssue({
        code: 'custom',
        path: ['start'],
        message: 'Choose a time that hasn’t passed',
      });
      return;
    }
    const message = validateBookingTime(from, atMinutes(date, end));
    if (message) ctx.addIssue({ code: 'custom', path: ['end'], message });
  });

type BookingFormValues = z.infer<typeof bookingSchema>;

/** What the form is opened or updated with. Anything left out is chosen in the form. */
export interface BookingDraft {
  room?: Room;
  /** A range picked on the calendar; without one the form suggests a slot on `day`. */
  start?: Date;
  end?: Date;
  /** The day to suggest a slot on when there's no range. Defaults to today. */
  day?: Date;
  classType?: ClassType;
  isShareable?: boolean;
}

/** The booking as it stands in the form, for the calendar to preview. */
export interface BookingPreview {
  room?: Room;
  date?: Date;
  /** Minutes after midnight; unset until chosen. */
  start?: number;
  end?: number;
  classType?: ClassType;
  isShareable: boolean;
}

interface CreateBookingFormProps {
  /**
   * Fills the form when it opens. Passing a new object later moves the room
   * and time to it (when a range is picked or the preview is dragged on the
   * calendar) and keeps everything else the user has chosen.
   */
  draft: BookingDraft;
  /**
   * The chosen room's bookings around the chosen day, to warn about clashes
   * before submitting; null while they're loading. The calendar loads them
   * anyway, so the form doesn't fetch its own copy.
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
}

/**
 * The form values a draft sets. On mount a draft without a range suggests a
 * slot; after mount it changes only what it names, so picking a room from the
 * calendar's filters keeps the chosen time.
 */
function draftValues(draft: BookingDraft, isUpdate = false): Partial<BookingFormValues> {
  const values: Partial<BookingFormValues> = {
    ...(draft.room && { room: draft.room }),
    ...(draft.classType && { classType: draft.classType }),
    ...(draft.isShareable !== undefined && { isShareable: draft.isShareable }),
  };
  if (draft.start && draft.end) {
    return {
      ...values,
      date: draft.start,
      start: minutesOfDay(draft.start),
      end: minutesOfDay(draft.end),
    };
  }
  if (isUpdate && !draft.day) return values;
  const date = draft.day ?? new Date();
  const slot = defaultBookingSlot(date, new Date());
  return { ...values, date, start: slot?.start ?? null, end: slot?.end ?? null };
}

/** The start times on offer for `day`, leaving out any that have passed. */
const upcomingStartTimes = (day: Date, now = new Date()) =>
  startTimeOptions(day).filter((time) => atMinutes(day, time) >= now);

const formatRange = (b: BookingView) =>
  `${format(new Date(startOf(b as BookingWithEitherDates)!), 'HH:mm')}–${format(new Date(endOf(b as BookingWithEitherDates)!), 'HH:mm')}`;

function conflictMessage(conflict: BookingConflict, isShareable: boolean): string {
  if (conflict.code === 'BOOKING_SHAREABLE_LIMIT') return SHAREABLE_FULL_MESSAGE;
  const [first, ...rest] = conflict.bookings;
  const more = rest.length > 0 ? ` and ${rest.length} more` : '';
  if (!isShareable && conflict.bookings.every((b) => b.shareable)) {
    return `Overlaps a shareable booking (${formatRange(first)})${more}. Turn on Shareable to share the room, or choose another time.`;
  }
  return `Overlaps a booking (${formatRange(first)})${more}. Choose another time.`;
}

type Notice = { tone: 'error' | 'warning'; message: string } | { tone: 'free'; room: Room } | null;

const NOTICE_STYLES = {
  error: 'border-destructive/40 bg-card text-destructive',
  warning:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
};

/**
 * The line above the buttons: an error once a booking has failed, a warning
 * while the time clashes (the backend still decides), or that the room is free.
 */
function BookingNotice({ notice }: { notice: Notice }) {
  if (!notice) return null;
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

/**
 * Books a room. Opened from a range picked on the calendar (which fills in the
 * room and time) or from the "New booking" button; everything can be changed
 * here. It checks the room's bookings for clashes as the time changes, so most
 * conflicts show before submitting. Mount it only while it's open: it loads
 * its options on mount.
 */
export function CreateBookingForm({
  draft,
  schedule,
  onPreviewChange,
  onBooked,
  onConflict,
}: CreateBookingFormProps) {
  const [classTypes, setClassTypes] = useState<ClassType[] | null>(null);
  const [classTypesFailed, setClassTypesFailed] = useState(false);
  // Tagged with its class type, so a switch never shows the previous price.
  const [price, setPrice] = useState<{ classType: ClassType; perHour: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  // A booking the backend refused, tagged with the choices it was for, so the
  // error clears as soon as the user changes any of them.
  const [rejection, setRejection] = useState<{ key: string; message: string } | null>(null);

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
  // clears as soon as any of them changes. (A clash is tracked in `rejection`.)
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
        if (current) setPrice({ classType, perHour: danceClass.pricePerHour });
      })
      .catch(() => {
        if (current) setPrice(null);
      });
    return () => {
      current = false;
    };
  }, [classType]);

  // Opening hours differ by day, so a new date can rule out the chosen times.
  function changeDate(next: Date) {
    form.setValue('date', next, { shouldValidate: true });
    if (start == null) return;
    if (!upcomingStartTimes(next).includes(start)) {
      form.setValue('start', null);
      form.setValue('end', null);
    } else if (end != null && !endTimeOptions(next, start).includes(end)) {
      form.setValue('end', null);
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

  const hasTime = !!date && start != null && end != null && end > start;
  const localConflict =
    schedule && room && hasTime
      ? findConflict(schedule, {
          start: atMinutes(date, start),
          end: atMinutes(date, end),
          isShareable,
        })
      : null;
  const clash = localConflict && conflictMessage(localConflict, isShareable);
  const rejected = rejection?.key === choiceKey ? rejection.message : null;
  const rootError =
    form.formState.errors.root?.message ??
    (classTypesFailed ? 'Could not load the class types. Please close this and try again.' : null);
  const notice: Notice = rootError
    ? { tone: 'error', message: rootError }
    : rejected
      ? // The reloaded schedule says what's in the way, when it shows the clash.
        { tone: 'error', message: clash ?? rejected }
      : clash
        ? { tone: 'warning', message: clash }
        : schedule && hasTime && room
          ? { tone: 'free', room }
          : null;

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
        setRejection({
          key: choiceKey,
          message: code === 'BOOKING_CONFLICT' ? NOT_FREE_MESSAGE : SHAREABLE_FULL_MESSAGE,
        });
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

  const minutes = hasTime ? end - start : null;
  const pricePerHour = price && price.classType === classType ? price.perHour : null;
  const total = minutes !== null && pricePerHour !== null ? (pricePerHour * minutes) / 60 : null;
  const startOptions = date ? upcomingStartTimes(date) : [];
  const endOptions = date && start != null ? endTimeOptions(date, start) : [];

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
          <div className="grid grid-cols-2 gap-3">
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
                        {field.value ? format(field.value, 'EEE d MMM') : 'Choose a date'}
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="start"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="booking-start">Start</FieldLabel>
                  <Select
                    // Radix doesn't update what the trigger shows when the value
                    // goes between empty and set from code (a new date clearing
                    // it, or a new start filling in the end), so it's remounted then.
                    key={field.value == null ? 'empty' : 'chosen'}
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
                    // Radix doesn't update what the trigger shows when the value
                    // goes between empty and set from code (a new date clearing
                    // it, or a new start filling in the end), so it's remounted then.
                    key={field.value == null ? 'empty' : 'chosen'}
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
                    Others can book the room at the same time, up to 3 at once.
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
            {total === null ? '—' : formatPrice(total)}
          </p>
        </div>
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
