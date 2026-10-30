import Cookies from 'js-cookie';
import { updateUserInfo, updateCredentials } from '@/lib/api/user';
import { TOKEN_KEY } from '@/lib/api/auth';
import api from '@/lib/api/axiosInstance';

jest.mock('@/lib/api/axiosInstance', () => ({
  patch: jest.fn(),
  put: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}));

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;
const mockPut = api.put as jest.MockedFunction<typeof api.put>;

const mockUser = {
  uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: 'ROLE_USER',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('user API', () => {
  describe('updateUserInfo()', () => {
    it('calls PATCH /users/me with the provided data', async () => {
      const data = { firstName: 'Jane', lastName: 'Doe', phoneNumber: '07123456789' };
      mockPatch.mockResolvedValue({ data: mockUser });

      await updateUserInfo(data);

      expect(mockPatch).toHaveBeenCalledWith('/users/me', data);
    });

    it('returns the updated user profile from the backend', async () => {
      mockPatch.mockResolvedValue({ data: mockUser });

      const result = await updateUserInfo({ firstName: 'Jane' });

      expect(result).toEqual(mockUser);
    });

    it('throws when the API call fails', async () => {
      mockPatch.mockRejectedValue(new Error('Network error'));

      await expect(updateUserInfo({})).rejects.toThrow('Network error');
    });
  });

  describe('updateCredentials()', () => {
    it('calls PUT /users/me/password with the new password', async () => {
      mockPut.mockResolvedValue({ data: { token: 'new.jwt.token' } });

      await updateCredentials({ password: 'NewPassword1!' });

      expect(mockPut).toHaveBeenCalledWith('/users/me/password', { password: 'NewPassword1!' });
    });

    it('stores the refreshed token returned by the backend', async () => {
      mockPut.mockResolvedValue({ data: { token: 'new.jwt.token' } });

      await updateCredentials({ password: 'NewPassword1!' });

      expect(Cookies.set).toHaveBeenCalledWith(TOKEN_KEY, 'new.jwt.token', { expires: 1 });
    });

    it('returns void on success', async () => {
      mockPut.mockResolvedValue({ data: { token: 'new.jwt.token' } });

      const result = await updateCredentials({ password: 'NewPassword1!' });

      expect(result).toBeUndefined();
    });

    it('throws when the API call fails', async () => {
      mockPut.mockRejectedValue(new Error('Network error'));

      await expect(updateCredentials({ password: 'NewPassword1!' })).rejects.toThrow(
        'Network error'
      );
    });
  });
});
