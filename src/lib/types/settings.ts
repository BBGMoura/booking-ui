/**
 * The studio's settings, as sent and received by `/admin/settings`.
 * Matches backend StudioSettingsDTO; optional text comes back as null when empty.
 */
export interface StudioSettings {
  studioName: string;
  recurringMaxDates: number;
  recurringMaxActive: number;
  sharedRoomMax: number;
  sharedDiscountPerHour: number;
  cancellationWindowHours: number;
  paymentDueDays: number;
  billingDay: number;
  invoicePrefix: string;
  businessName: string | null;
  businessAddress: string | null;
  bankAccountName: string | null;
  bankSortCode: string | null;
  bankAccountNumber: string | null;
  updatedAt: string;
}

/** Matches backend StudioSettingsRequest. */
export type StudioSettingsRequest = Omit<StudioSettings, 'updatedAt'>;
