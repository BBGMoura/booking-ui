import type { BookingView, CreateBookingData, Room } from '@/lib/types/booking';
import api from '@/lib/api/axiosInstance';

export async function getRoomSchedule(
  room: Room,
  dateFrom: string,
  dateTo: string
): Promise<BookingView[]> {
  const { data } = await api.get<BookingView[]>('/bookings/schedule', {
    params: { room, dateFrom, dateTo },
  });
  return data;
}

export async function getMyBookingsInRange(
  dateFrom: string,
  dateTo: string
): Promise<BookingView[]> {
  // The calendar needs every booking in the range, not one page of them —
  // the backend defaults to a page size of 5, so request a size large
  // enough that any realistic date range comes back in a single page.
  const { data } = await api.get<{ content: BookingView[] }>('/bookings', {
    params: { dateFrom, dateTo, size: 1000 },
  });
  return data.content;
}

export async function createBooking(data: CreateBookingData): Promise<BookingView> {
  const { data: response } = await api.post<BookingView>('/bookings', data);
  return response;
}

export async function cancelBooking(bookingUid: string): Promise<void> {
  await api.delete(`/bookings/${bookingUid}`);
}
