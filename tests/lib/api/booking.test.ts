import MockAdapter from 'axios-mock-adapter';
import {
  getRoomSchedule,
  getMyBookingsInRange,
  createBooking,
  cancelBooking,
} from '@/lib/api/booking';
import type { BookingView, CreateBookingData } from '@/lib/types/booking';
import api from '@/lib/api/axiosInstance';

const mockBooking: BookingView = {
  uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  userUid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  room: 'ASTAIRE',
  status: 'BOOKED',
  shareable: false,
  classType: 'PRIVATE',
  dateFrom: '2026-11-01T10:00:00Z',
  dateTo: '2026-11-01T11:00:00Z',
  totalPrice: 20,
};

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.reset();
});

describe('booking API', () => {
  describe('getRoomSchedule()', () => {
    it('calls the schedule endpoint with room and date range as params', async () => {
      mock.onGet('/bookings/schedule').reply(200, [mockBooking]);

      await getRoomSchedule('ASTAIRE', '2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z');

      expect(mock.history.get[0].url).toBe('/bookings/schedule');
      expect(mock.history.get[0].params).toEqual({
        room: 'ASTAIRE',
        dateFrom: '2026-11-01T00:00:00Z',
        dateTo: '2026-11-02T00:00:00Z',
      });
    });

    it('returns the list of bookings for the room', async () => {
      mock.onGet('/bookings/schedule').reply(200, [mockBooking]);

      const result = await getRoomSchedule(
        'ASTAIRE',
        '2026-11-01T00:00:00Z',
        '2026-11-02T00:00:00Z'
      );

      expect(result).toEqual([mockBooking]);
    });
  });

  describe('getMyBookingsInRange()', () => {
    it('calls the bookings endpoint with the date range as params', async () => {
      mock.onGet('/bookings').reply(200, { content: [mockBooking] });

      await getMyBookingsInRange('2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z');

      expect(mock.history.get[0].url).toBe('/bookings');
      expect(mock.history.get[0].params).toEqual({
        dateFrom: '2026-11-01T00:00:00Z',
        dateTo: '2026-11-02T00:00:00Z',
        size: 1000,
      });
    });

    it('returns the page content as a flat array', async () => {
      mock.onGet('/bookings').reply(200, { content: [mockBooking] });

      const result = await getMyBookingsInRange('2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z');

      expect(result).toEqual([mockBooking]);
    });
  });

  describe('createBooking()', () => {
    const createData: CreateBookingData = {
      room: 'ASTAIRE',
      classType: 'PRIVATE',
      isShareable: false,
      dateFrom: '2026-11-01T10:00:00Z',
      dateTo: '2026-11-01T11:00:00Z',
    };

    it('posts the booking data to the bookings endpoint', async () => {
      mock.onPost('/bookings').reply(201, mockBooking);

      await createBooking(createData);

      expect(mock.history.post[0].url).toBe('/bookings');
      expect(JSON.parse(mock.history.post[0].data)).toEqual(createData);
    });

    it('returns the created booking', async () => {
      mock.onPost('/bookings').reply(201, mockBooking);

      const result = await createBooking(createData);

      expect(result).toEqual(mockBooking);
    });

    it('throws when the booking conflicts with an existing one', async () => {
      mock.onPost('/bookings').reply(409, {
        status: 409,
        error: 'CONFLICT',
        message: 'This request conflicted with another. Please try again.',
        details: [],
      });

      await expect(createBooking(createData)).rejects.toThrow();
    });
  });

  describe('cancelBooking()', () => {
    it('calls DELETE on the booking endpoint with the booking uid', async () => {
      mock.onDelete(`/bookings/${mockBooking.uid}`).reply(204);

      await cancelBooking(mockBooking.uid);

      expect(mock.history.delete[0].url).toBe(`/bookings/${mockBooking.uid}`);
    });

    it('returns void on success', async () => {
      mock.onDelete(`/bookings/${mockBooking.uid}`).reply(204);

      const result = await cancelBooking(mockBooking.uid);

      expect(result).toBeUndefined();
    });
  });
});
