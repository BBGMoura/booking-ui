import api from '@/lib/api/axiosInstance';

describe('axiosInstance', () => {
  it('prefixes the base URL with /api/v1 to match the backend', () => {
    expect(api.defaults.baseURL).toBe(`${process.env.NEXT_PUBLIC_API_URL}/api/v1`);
  });
});
