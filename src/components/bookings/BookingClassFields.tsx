'use client';

import { Controller, type Control } from 'react-hook-form';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ClassType } from '@/lib/types/booking';
import type { BookingFormValues } from '@/lib/utils/bookingForm';
import { CLASS_TYPE_LABELS } from '@/lib/utils/calendarEvents';

interface BookingClassFieldsProps {
  control: Control<BookingFormValues>;
  /** The class types the user may book, or null while they're loading. */
  classTypes: ClassType[] | null;
  disabled: boolean;
}

/** The booking form's class type and shareable fields. */
export function BookingClassFields({
  control,
  classTypes,
  disabled: isLoading,
}: BookingClassFieldsProps) {
  return (
    <>
      <Controller
        name="classType"
        control={control}
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
        control={control}
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
    </>
  );
}
