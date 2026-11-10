import MockAdapter from 'axios-mock-adapter';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';
import type { DanceClass } from '@/lib/types/danceClass';
import api from '@/lib/api/axiosInstance';

const mockDanceClass: DanceClass = {
  classType: 'PRIVATE',
  active: true,
  pricePerHour: 20,
  role: 'ROLE_USER',
};

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.reset();
});

describe('danceClass API', () => {
  describe('getClassTypes()', () => {
    it('calls the class-types endpoint', async () => {
      mock.onGet('/dance-classes/class-types').reply(200, ['PRIVATE', 'GROUP']);

      await getClassTypes();

      expect(mock.history.get[0].url).toBe('/dance-classes/class-types');
    });

    it('returns the list of active class types', async () => {
      mock.onGet('/dance-classes/class-types').reply(200, ['PRIVATE', 'GROUP']);

      const result = await getClassTypes();

      expect(result).toEqual(['PRIVATE', 'GROUP']);
    });
  });

  describe('getDanceClass()', () => {
    it('calls the dance-classes endpoint with classType as a param', async () => {
      mock.onGet('/dance-classes').reply(200, mockDanceClass);

      await getDanceClass('PRIVATE');

      expect(mock.history.get[0].url).toBe('/dance-classes');
      expect(mock.history.get[0].params).toEqual({ classType: 'PRIVATE' });
    });

    it('returns the dance class details', async () => {
      mock.onGet('/dance-classes').reply(200, mockDanceClass);

      const result = await getDanceClass('PRIVATE');

      expect(result).toEqual(mockDanceClass);
    });
  });
});
