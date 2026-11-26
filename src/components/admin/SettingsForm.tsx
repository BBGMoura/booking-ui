'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useStudioSettings } from '@/hooks/use-studio-settings';
import { updateStudioSettings } from '@/lib/api/settings';
import type { StudioSettings } from '@/lib/types/settings';
import { parseApiError } from '@/lib/utils/errorUtils';
import {
  studioSettingsSchema,
  toFormValues,
  toRequest,
  type StudioSettingsFormValues,
} from '@/lib/utils/studioSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

type FieldName = keyof StudioSettingsFormValues;

interface FieldConfig {
  name: FieldName;
  label: string;
  description?: string;
  inputMode?: 'numeric' | 'decimal';
  placeholder?: string;
}

const SECTIONS: { title: string; fields: FieldConfig[] }[] = [
  {
    title: 'Studio',
    fields: [{ name: 'studioName', label: 'Studio name' }],
  },
  {
    title: 'Bookings',
    fields: [
      {
        name: 'recurringMaxDates',
        label: 'Most dates in a recurring booking',
        description: 'How many dates one recurring booking can repeat on.',
        inputMode: 'numeric',
      },
      {
        name: 'recurringMaxActive',
        label: 'Most active recurring bookings per person',
        description: 'How many recurring bookings one person can have running at once.',
        inputMode: 'numeric',
      },
      {
        name: 'sharedRoomMax',
        label: 'Most people sharing a room',
        description: 'How many people can book a shared room at the same time.',
        inputMode: 'numeric',
      },
    ],
  },
  {
    title: 'Billing',
    fields: [
      {
        name: 'sharedDiscountPerHour',
        label: 'Shared room discount per hour (£)',
        description: 'Taken off the hourly price for each person sharing a room.',
        inputMode: 'decimal',
        placeholder: '1.50',
      },
      {
        name: 'cancellationWindowHours',
        label: 'Cancellation window (hours)',
        description: 'How many hours before a booking starts it can still be cancelled.',
        inputMode: 'numeric',
      },
      {
        name: 'paymentDueDays',
        label: 'Payment due (days)',
        description: 'How many days after an invoice is made it is due.',
        inputMode: 'numeric',
      },
      {
        name: 'billingDay',
        label: 'Billing day',
        description:
          'Invoices are made on this day each month (1 to 28). Invoices cover everything since the last one.',
        inputMode: 'numeric',
      },
      {
        name: 'invoicePrefix',
        label: 'Invoice number prefix',
        description: 'Letters at the start of every invoice number.',
        placeholder: 'ACS',
      },
    ],
  },
  {
    title: 'Invoice details',
    fields: [
      { name: 'businessName', label: 'Business name' },
      { name: 'businessAddress', label: 'Business address' },
      { name: 'bankAccountName', label: 'Bank account name' },
      { name: 'bankSortCode', label: 'Sort code', placeholder: '12-34-56', inputMode: 'numeric' },
      { name: 'bankAccountNumber', label: 'Account number', inputMode: 'numeric' },
    ],
  },
];

/** Admin › Settings: loads the studio's settings, then shows them in a form. */
export function SettingsForm() {
  const { settings, error, reload } = useStudioSettings();

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-6">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div
        className="mx-auto w-full max-w-3xl space-y-4 pt-2"
        aria-busy="true"
        aria-label="Loading settings"
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  return <SettingsFields initial={settings} />;
}

function SettingsFields({ initial }: { initial: StudioSettings }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<StudioSettingsFormValues>({
    resolver: zodResolver(studioSettingsSchema),
    mode: 'onTouched',
    defaultValues: toFormValues(initial),
  });

  async function onSubmit(values: StudioSettingsFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const saved = await updateStudioSettings(toRequest(values));
      form.reset(toFormValues(saved));
      toast.success('Settings saved');
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-3xl space-y-4"
      noValidate
    >
      {SECTIONS.map((section) => (
        <Card key={section.title} className="shadow-none">
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((config) => (
              <Controller
                key={config.name}
                name={config.name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{config.label}</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      inputMode={config.inputMode}
                      placeholder={config.placeholder}
                      autoComplete="off"
                      disabled={submitting}
                      aria-invalid={fieldState.invalid}
                    />
                    {config.description && (
                      <FieldDescription>{config.description}</FieldDescription>
                    )}
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <Spinner />
            Saving...
          </>
        ) : (
          'Save'
        )}
      </Button>
    </form>
  );
}
