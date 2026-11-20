'use client';

import { useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROOMS } from '@/lib/types/booking';
import { type BookingFormValues, upcomingStartTimes } from '@/lib/utils/bookingForm';
import { endTimeOptions, formatDuration } from '@/lib/utils/bookingTime';
import { ROOM_LABELS } from '@/lib/utils/calendarEvents';
import { toTime } from '@/lib/utils/calendarUtils';

interface BookingTimeFieldsProps {
  form: UseFormReturn<BookingFormValues>;
  disabled: boolean;
}

/** The booking form's room, date, start and end fields. */
export function BookingTimeFields({ form, disabled: isLoading }: BookingTimeFieldsProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [date, start, end] = form.watch(['date', 'start', 'end']);

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

  const startOptions = date ? upcomingStartTimes(date) : [];
  const endOptions = date && start != null ? endTimeOptions(date, start) : [];

  return (
    <>
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
                        {/* Short, so it fits the half-width field once chosen. */}
                        {formatDuration(time - start!, { short: true })}
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
    </>
  );
}
