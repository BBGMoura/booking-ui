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
