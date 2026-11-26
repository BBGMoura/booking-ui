'use client';

import { useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type FieldName = keyof StudioSettingsFormValues;

interface FieldConfig {
  name: FieldName;
  label: string;
  description?: string;
  inputMode?: 'numeric' | 'decimal';
  placeholder?: string;
  /** Shown inside the input, before the value, e.g. "£". */
  prefix?: string;
  /** Shown inside the input, after the value, e.g. "hours". */
  suffix?: string;
  /**
   * `inline` puts a short value beside its label, for numbers.
   * `stacked` puts a full-width input under its label, for text.
   */
  layout: 'inline' | 'stacked';
  multiline?: boolean;
  /** Stacked fields with the same row sit side by side on wider screens. */
  row?: string;
}

interface Section {
  title: string;
  description: string;
  fields: FieldConfig[];
}

const SECTIONS: Section[] = [
  {
    title: 'Studio',
    description: 'How the studio is named across the Booking Portal.',
    fields: [{ name: 'studioName', label: 'Studio name', layout: 'stacked' }],
  },
  {
    title: 'Bookings',
    description: 'Limits on recurring bookings and shared rooms.',
    fields: [
      {
        name: 'recurringMaxDates',
        label: 'Most dates in a recurring booking',
        description: 'How many dates one recurring booking can repeat on.',
        inputMode: 'numeric',
        suffix: 'dates',
        layout: 'inline',
      },
      {
        name: 'recurringMaxActive',
        label: 'Most active recurring bookings per person',
        description: 'How many recurring bookings one person can have running at once.',
        inputMode: 'numeric',
        suffix: 'bookings',
        layout: 'inline',
      },
      {
        name: 'sharedRoomMax',
        label: 'Most people sharing a room',
        description: 'How many people can book a shared room at the same time.',
        inputMode: 'numeric',
        suffix: 'people',
        layout: 'inline',
      },
      {
        name: 'cancellationWindowHours',
        label: 'Cancellation window',
        description: 'How many hours before a booking starts it can still be cancelled.',
        inputMode: 'numeric',
        suffix: 'hours',
        layout: 'inline',
      },
    ],
  },
  {
    title: 'Billing',
    description: 'When invoices are made, when they are due and how they are numbered.',
    fields: [
      {
        name: 'sharedDiscountPerHour',
        label: 'Shared room discount',
        description: 'Taken off the hourly price for each person sharing a room.',
        inputMode: 'decimal',
        placeholder: '1.50',
        prefix: '£',
        suffix: '/ hour',
        layout: 'inline',
      },
      {
        name: 'billingDay',
        label: 'Billing day',
        description:
          'Invoices are made on this day each month (1 to 28). Invoices cover everything since the last one.',
        inputMode: 'numeric',
        prefix: 'Day',
        layout: 'inline',
      },
      {
        name: 'paymentDueDays',
        label: 'Payment due',
        description: 'How many days after an invoice is made it is due.',
        inputMode: 'numeric',
        suffix: 'days',
        layout: 'inline',
      },
      {
        name: 'invoicePrefix',
        label: 'Invoice number prefix',
        description: 'Letters at the start of every invoice number.',
        placeholder: 'ACS',
        layout: 'inline',
      },
    ],
  },
  {
    title: 'Invoice details',
    description: 'Printed on every invoice so people know who to pay and how.',
    fields: [
      { name: 'businessName', label: 'Business name', layout: 'stacked' },
      { name: 'businessAddress', label: 'Business address', layout: 'stacked', multiline: true },
      { name: 'bankAccountName', label: 'Bank account name', layout: 'stacked' },
      {
        name: 'bankSortCode',
        label: 'Sort code',
        placeholder: '12-34-56',
        inputMode: 'numeric',
        layout: 'stacked',
        row: 'bank',
      },
      {
        name: 'bankAccountNumber',
        label: 'Account number',
        placeholder: '12345678',
        inputMode: 'numeric',
        layout: 'stacked',
        row: 'bank',
      },
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
        className="mx-auto w-full max-w-5xl space-y-10"
        aria-busy="true"
        aria-label="Loading settings"
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid gap-6 md:grid-cols-[16rem_1fr]">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-40 rounded-2xl" />
          </div>
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
  const { isDirty } = form.formState;

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

  function discard() {
    form.reset();
    setError(null);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-5xl"
      aria-label="Settings"
      noValidate
    >
      <div className="divide-y">
        {SECTIONS.map((section) => (
          <SettingsSection
            key={section.title}
            section={section}
            control={form.control}
            disabled={submitting}
          />
        ))}
      </div>

      {/* Only follows the scroll while there's something to save, so it doesn't cover the form otherwise. */}
      <div
        className={cn(
          'bg-card mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3',
          isDirty && 'sticky bottom-0 shadow-lg'
        )}
      >
        <div className="min-h-5 text-sm" aria-live="polite">
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </p>
          )}
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Button type="button" variant="ghost" onClick={discard} disabled={!isDirty || submitting}>
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty || submitting}>
            {submitting ? (
              <>
                <Spinner />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SettingsSection({
  section,
  control,
  disabled,
}: {
  section: Section;
  control: Control<StudioSettingsFormValues>;
  disabled: boolean;
}) {
  const headingId = `settings-${section.title.toLowerCase().replace(/\s+/g, '-')}`;

  // Stacked fields that share a `row` are laid out side by side.
  const rows: FieldConfig[][] = [];
  for (const field of section.fields) {
    const last = rows.at(-1);
    if (field.row && last?.[0].row === field.row) last.push(field);
    else rows.push([field]);
  }

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-x-10 gap-y-4 py-8 first:pt-0 md:grid-cols-[16rem_1fr]"
    >
      <div className="space-y-1">
        <h2 id={headingId} className="text-base font-semibold">
          {section.title}
        </h2>
        <p className="text-muted-foreground text-sm text-balance">{section.description}</p>
      </div>

      <div className="bg-card divide-y rounded-2xl border shadow-xs">
        {rows.map((row) => (
          <div
            key={row[0].name}
            className={cn('p-5', row.length > 1 && 'grid gap-4 sm:grid-cols-2')}
          >
            {row.map((config) => (
              <SettingField
                key={config.name}
                config={config}
                control={control}
                disabled={disabled}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingField({
  config,
  control,
  disabled,
}: {
  config: FieldConfig;
  control: Control<StudioSettingsFormValues>;
  disabled: boolean;
}) {
  return (
    <Controller
      name={config.name}
      control={control}
      render={({ field, fieldState }) => {
        const descriptionId = config.description ? `${field.name}-description` : undefined;
        const inputProps = {
          ...field,
          id: field.name,
          inputMode: config.inputMode,
          placeholder: config.placeholder,
          autoComplete: 'off',
          disabled,
          'aria-invalid': fieldState.invalid,
          'aria-describedby': descriptionId,
        };

        const input =
          config.prefix || config.suffix ? (
            <InputGroup data-disabled={disabled}>
              {config.prefix && (
                <InputGroupAddon>
                  <InputGroupText>{config.prefix}</InputGroupText>
                </InputGroupAddon>
              )}
              <InputGroupInput {...inputProps} className="tabular-nums" />
              {config.suffix && (
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{config.suffix}</InputGroupText>
                </InputGroupAddon>
              )}
            </InputGroup>
          ) : config.multiline ? (
            <Textarea {...inputProps} rows={3} className="resize-none" />
          ) : (
            <Input {...inputProps} />
          );

        const label = (
          <>
            <FieldLabel htmlFor={field.name}>{config.label}</FieldLabel>
            {config.description && (
              <FieldDescription id={descriptionId}>{config.description}</FieldDescription>
            )}
          </>
        );
        const error = fieldState.invalid && <FieldError errors={[fieldState.error]} />;

        if (config.layout === 'stacked') {
          return (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              {label}
              {input}
              {error}
            </Field>
          );
        }

        return (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-md">{label}</div>
              <div className="flex flex-col gap-1.5 sm:w-44 sm:shrink-0">
                {input}
                {error}
              </div>
            </div>
          </Field>
        );
      }}
    />
  );
}
