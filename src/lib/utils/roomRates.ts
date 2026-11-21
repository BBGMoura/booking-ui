import { CLASS_TYPES, type ClassType } from '@/lib/types/booking';
import { USER_ROLES } from '@/lib/types/auth';
import type { DanceClass } from '@/lib/types/danceClass';
import type { RoomRateRequest } from '@/lib/api/danceClass';
import { CLASS_TYPE_LABELS } from '@/lib/utils/calendarEvents';

export interface RoomRateRow {
  classType: ClassType;
  label: string;
  /** The active rate, or null when the booking type can't be booked. */
  rate: DanceClass | null;
}

/** One row per booking type, in the calendar's order, with its active rate if it has one. */
export function mergeRoomRates(rates: DanceClass[]): RoomRateRow[] {
  return (Object.values(CLASS_TYPES) as ClassType[]).map((classType) => ({
    classType,
    label: CLASS_TYPE_LABELS[classType],
    rate: rates.find((r) => r.classType === classType && r.active) ?? null,
  }));
}

/** Whole pounds up to 999 with at most 2 decimals, as the backend's DanceClassRequest allows. */
export const PRICE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** An error message for the price field, or null when it's valid. */
export function validatePrice(value: string): string | null {
  const price = value.trim();
  if (!price) return 'Price per hour is required';
  if (!PRICE_PATTERN.test(price)) {
    return 'Enter a price from £0.00 to £999.99, with up to 2 decimal places';
  }
  return null;
}

export function buildRateRequest(
  classType: ClassType,
  price: string,
  adminOnly: boolean
): RoomRateRequest {
  return {
    classType,
    pricePerHour: Number(price.trim()),
    role: adminOnly ? USER_ROLES.ADMIN : USER_ROLES.USER,
  };
}

export function formatPrice(price: number): string {
  return `£${price.toFixed(2)}`;
}
