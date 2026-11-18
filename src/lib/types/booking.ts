/**
 * Booking Types
 * Matches backend Room, BookingStatusType, ClassType and BookingDetail shapes
 */

export const ROOMS = {
  ASTAIRE: 'ASTAIRE',
  BUSSELL: 'BUSSELL',
  ALEX_MOORE: 'ALEX_MOORE',
  FOSSE: 'FOSSE',
} as const;

export type Room = (typeof ROOMS)[keyof typeof ROOMS];

export const BOOKING_STATUSES = {
  BOOKED: 'BOOKED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];

export const CLASS_TYPES = {
  PRIVATE: 'PRIVATE',
  PRACTICE: 'PRACTICE',
  GROUP: 'GROUP',
  UNAVAILABLE: 'UNAVAILABLE',
  OTHER: 'OTHER',
} as const;

export type ClassType = (typeof CLASS_TYPES)[keyof typeof CLASS_TYPES];

/**
 * A booking as returned by the API
 * Matches backend BookingDetail
 */
export interface BookingView {
  uid: string;
  userUid: string;
  room: Room;
  status: BookingStatus;
  shareable: boolean;
  classType: ClassType;
  dateFrom: string;
  dateTo: string;
  totalPrice: number;
  /** Who made the booking. Not set for every user, so either can be null. */
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Request body for creating a booking
 * Matches backend BookingRequest
 */
export interface CreateBookingData {
  room: Room;
  classType: ClassType;
  isShareable: boolean;
  dateFrom: string;
  dateTo: string;
}

/**
 * Paging metadata nested under `page` in a paged response
 */
export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

/**
 * A paged response from the API
 * Matches Spring Data's PagedModel: the backend serialises pages VIA_DTO,
 * so paging info sits under `page` and there are no `first`/`last` flags.
 */
export interface Page<T> {
  content: T[];
  page: PageMetadata;
}

/**
 * Query params for GET /bookings
 * "Upcoming": dateFrom=<now>, order=ASC. "Past": dateTo=<now>, order=DESC.
 * `order` must be upper case: the backend rejects `asc`/`desc` with a 400.
 */
export interface GetBookingsParams {
  page?: number;
  size?: number;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  order?: 'ASC' | 'DESC';
}
