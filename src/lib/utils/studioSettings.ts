import { z } from 'zod';
import type { StudioSettings, StudioSettingsRequest } from '@/lib/types/settings';

function wholeNumber(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(/^\d+$/, `${label} must be a whole number`)
    .refine((v) => Number(v) >= min && Number(v) <= max, `${label} must be ${min} to ${max}`);
}

// The limits mirror the backend's StudioSettingsRequest.
export const studioSettingsSchema = z.object({
  studioName: z.string().trim().min(1, 'Studio name is required').max(100, 'Max 100 characters'),
  recurringMaxDates: wholeNumber('Most dates', 1, 52),
  recurringMaxActive: wholeNumber('Most active recurring bookings', 1, 20),
  sharedRoomMax: wholeNumber('Most people sharing a room', 2, 10),
  sharedDiscountPerHour: z
    .string()
    .trim()
    .min(1, 'Shared room discount is required')
    .regex(/^\d{1,8}(\.\d{1,2})?$/, 'Enter an amount in pounds, like 1.50'),
  cancellationWindowHours: wholeNumber('Cancellation window', 0, 168),
  paymentDueDays: wholeNumber('Payment due', 1, 90),
  billingDay: wholeNumber('Billing day', 1, 28),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, 'Invoice number prefix is required')
    .max(10, 'Max 10 characters')
    .regex(/^[A-Za-z]*$/, 'Letters only'),
  businessName: z.string().trim().max(200, 'Max 200 characters'),
  businessAddress: z.string().trim().max(200, 'Max 200 characters'),
  bankAccountName: z.string().trim().max(200, 'Max 200 characters'),
  bankSortCode: z
    .string()
    .trim()
    .regex(/^(\d{6}|\d{2}-\d{2}-\d{2})?$/, 'Must be 6 digits, for example 12-34-56'),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^(\d{8})?$/, 'Must be 8 digits'),
});

export type StudioSettingsFormValues = z.infer<typeof studioSettingsSchema>;

/** The backend stores a sort code as six digits; show it as 12-34-56. */
function formatSortCode(code: string | null): string {
  return code && /^\d{6}$/.test(code) ? code.replace(/(\d{2})(?=\d)/g, '$1-') : (code ?? '');
}

export function toFormValues(settings: StudioSettings): StudioSettingsFormValues {
  return {
    studioName: settings.studioName,
    recurringMaxDates: String(settings.recurringMaxDates),
    recurringMaxActive: String(settings.recurringMaxActive),
    sharedRoomMax: String(settings.sharedRoomMax),
    sharedDiscountPerHour: settings.sharedDiscountPerHour.toFixed(2),
    cancellationWindowHours: String(settings.cancellationWindowHours),
    paymentDueDays: String(settings.paymentDueDays),
    billingDay: String(settings.billingDay),
    invoicePrefix: settings.invoicePrefix,
    businessName: settings.businessName ?? '',
    businessAddress: settings.businessAddress ?? '',
    bankAccountName: settings.bankAccountName ?? '',
    bankSortCode: formatSortCode(settings.bankSortCode),
    bankAccountNumber: settings.bankAccountNumber ?? '',
  };
}

/** Empty optional text is sent as null; the backend trims text and accepts either sort code form. */
export function toRequest(values: StudioSettingsFormValues): StudioSettingsRequest {
  const optional = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    studioName: values.studioName.trim(),
    recurringMaxDates: Number(values.recurringMaxDates),
    recurringMaxActive: Number(values.recurringMaxActive),
    sharedRoomMax: Number(values.sharedRoomMax),
    sharedDiscountPerHour: Number(values.sharedDiscountPerHour),
    cancellationWindowHours: Number(values.cancellationWindowHours),
    paymentDueDays: Number(values.paymentDueDays),
    billingDay: Number(values.billingDay),
    invoicePrefix: values.invoicePrefix.trim(),
    businessName: optional(values.businessName),
    businessAddress: optional(values.businessAddress),
    bankAccountName: optional(values.bankAccountName),
    bankSortCode: optional(values.bankSortCode),
    bankAccountNumber: optional(values.bankAccountNumber),
  };
}
