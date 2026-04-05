import { updateUserInfo, updateCredentials } from '@/lib/api/user';
import api from '@/lib/api/axiosInstance';

jest.mock('@/lib/api/axiosInstance', () => ({
  put: jest.fn(),
}));

const mockPut = api.put as jest.MockedFunction<typeof api.put>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('user API', () => {
  describe('updateUserInfo()', () => {
    it('calls PUT /user-info with the provided data', async () => {
      const data = { firstName: 'Jane', lastName: 'Doe', phoneNumber: '07123456789' };
      mockPut.mockResolvedValue({ data: { id: 1, userId: 1, ...data } });

      await updateUserInfo(data);

      expect(mockPut).toHaveBeenCalledWith('/user-info', data);
    });

    it('returns the UserInfoResponse from the backend', async () => {
      const data = { firstName: 'Jane', lastName: 'Doe', phoneNumber: '07123456789' };
      const response = {
        id: 1,
        userId: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '07123456789',
      };
      mockPut.mockResolvedValue({ data: response });

      const result = await updateUserInfo(data);

      expect(result).toEqual(response);
    });

    it('throws when the API call fails', async () => {
      mockPut.mockRejectedValue(new Error('Network error'));

      await expect(updateUserInfo({})).rejects.toThrow('Network error');
    });
  });

  describe('updateCredentials()', () => {
    it('calls PUT /user with the provided data', async () => {
      mockPut.mockResolvedValue({ data: undefined });

      await updateCredentials({ password: 'NewPassword1!' });

      expect(mockPut).toHaveBeenCalledWith('/user', { password: 'NewPassword1!' });
    });

    it('returns void on success', async () => {
      mockPut.mockResolvedValue({ data: undefined });

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
