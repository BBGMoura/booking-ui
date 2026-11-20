import MockAdapter from 'axios-mock-adapter';
import Cookies from 'js-cookie';
import {
  login,
  register,
  checkInvite,
  fetchCurrentUser,
  resetPassword,
  confirmPasswordReset,
  logout,
  SESSION_EXPIRED_KEY,
  setUnauthorizedHandler,
} from '@/lib/api/auth';
import { LoginCredentials, RegisterData, User } from '@/lib/types/auth';
import api from '@/lib/api/axiosInstance';

const mockUser: User = {
  uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: 'ROLE_USER',
};

const mockToken = 'fake.jwt.token';

const mockRegisterResponse = {
  token: mockToken,
  uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  role: 'ROLE_USER',
  enabled: true,
};

const mockLoginCredentials: LoginCredentials = {
  email: 'jane@example.com',
  password: 'Password1!',
};

const mockRegisterData: RegisterData = {
  firstName: 'Jana',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  password: 'Password1!',
};

let mock: MockAdapter;

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

beforeEach(() => {
  mock = new MockAdapter(api);
  sessionStorage.clear();
});

afterEach(() => {
  setUnauthorizedHandler(null);
  mock.reset();
  jest.clearAllMocks();
});

describe('auth API', () => {
  describe('request interceptor', () => {
    it('attaches Authorization header when token exists in cookie', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockToken);
      mock.onGet('/users/me').reply(200, mockUser);

      await fetchCurrentUser();

      expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('does not attach Authorization header when no token exists', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      mock.onGet('/users/me').reply(200, mockUser);

      await fetchCurrentUser();

      expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    it('sets session_expired flag in sessionStorage on 401 when cookie exists', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockToken);
      mock.onGet('/users/me').reply(401);

      await fetchCurrentUser().catch(() => {});

      expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBe('true');
    });

    it('removes the token cookie on 401 when cookie exists', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockToken);
      mock.onGet('/users/me').reply(401);

      await fetchCurrentUser().catch(() => {});

      expect(Cookies.remove).toHaveBeenCalledWith('auth_token');
    });

    it('does not set session_expired flag on 401 when no cookie exists', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      mock.onGet('/users/me').reply(401);

      await fetchCurrentUser().catch(() => {});

      expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    });

    it('does not set session_expired flag on other error codes', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockToken);
      mock.onGet('/users/me').reply(500);

      await fetchCurrentUser().catch(() => {});

      expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    });
  });

  describe('response interceptor: session expiry handler', () => {
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('calls the handler once when a request with a token gets 401', async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      (Cookies.get as jest.Mock).mockReturnValue(mockToken);
      mock.onGet('/users/me').reply(401);

      void fetchCurrentUser().catch(() => {});
      await flush();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calls the handler once when several requests fail together', async () => {
      const handler = jest.fn();
      const onRejected = jest.fn();
      setUnauthorizedHandler(handler);
      // The first 401 removes the cookie, as the real one would
      let cookie: string | undefined = mockToken;
      (Cookies.get as jest.Mock).mockImplementation(() => cookie);
      (Cookies.remove as jest.Mock).mockImplementation(() => {
        cookie = undefined;
      });
      mock.onGet('/users/me').reply(401);

      for (let i = 0; i < 10; i++) void fetchCurrentUser().catch(onRejected);
      await flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(Cookies.remove).toHaveBeenCalledTimes(1);
      expect(onRejected).not.toHaveBeenCalled();
      (Cookies.remove as jest.Mock).mockReset();
    });

    it('does not call the handler when the login request itself gets 401', async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      (Cookies.get as jest.Mock).mockReturnValue(mockToken);
      mock.onPost('/auth/login').reply(401);

      await expect(login(mockLoginCredentials)).rejects.toThrow();

      expect(handler).not.toHaveBeenCalled();
      expect(Cookies.remove).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    });

    it('does not call the handler on 401 when there is no token', async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      mock.onGet('/users/me').reply(401);

      await expect(fetchCurrentUser()).rejects.toThrow();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('login()', () => {
    it('calls the correct endpoint with credentials', async () => {
      mock.onPost('/auth/login').reply(200, { token: mockToken });

      await login(mockLoginCredentials);

      expect(mock.history.post[0].url).toBe('/auth/login');
      expect(JSON.parse(mock.history.post[0].data)).toEqual(mockLoginCredentials);
    });

    it('stores the token in a cookie after login', async () => {
      mock.onPost('/auth/login').reply(200, { token: mockToken });

      await login(mockLoginCredentials);

      expect(Cookies.set).toHaveBeenCalledWith('auth_token', mockToken, { expires: 1 });
    });

    it('returns void on successful login', async () => {
      mock.onPost('/auth/login').reply(200, { token: mockToken });

      const result = await login(mockLoginCredentials);

      expect(result).toBeUndefined();
    });

    it('throws an error if the backend returns an error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mock.onPost('/auth/login').reply(401);

      await expect(login(mockLoginCredentials)).rejects.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('register()', () => {
    it('calls the correct endpoint with registration data', async () => {
      mock.onPost('/auth/register').reply(201, mockRegisterResponse);

      await register(mockRegisterData);

      expect(mock.history.post[0].url).toBe('/auth/register');
      expect(JSON.parse(mock.history.post[0].data)).toEqual(mockRegisterData);
    });

    it('stores the token in a cookie after registration', async () => {
      mock.onPost('/auth/register').reply(201, mockRegisterResponse);

      await register(mockRegisterData);

      expect(Cookies.set).toHaveBeenCalledWith('auth_token', mockToken, { expires: 1 });
    });

    it('returns the user object after registration', async () => {
      mock.onPost('/auth/register').reply(201, mockRegisterResponse);

      const result = await register(mockRegisterData);

      expect(result).toEqual(mockUser);
    });
  });

  describe('checkInvite()', () => {
    it('calls the correct endpoint with email as a query param', async () => {
      mock.onGet('/auth/invitations').reply(200, { email: 'jane@example.com', invited: true });

      await checkInvite('jane@example.com');

      expect(mock.history.get[0].url).toBe('/auth/invitations');
      expect(mock.history.get[0].params).toEqual({ email: 'jane@example.com' });
    });

    it('returns the full check invite response', async () => {
      const mockResponse = { email: 'jane@example.com', invited: true };
      mock.onGet('/auth/invitations').reply(200, mockResponse);

      const result = await checkInvite('jane@example.com');

      expect(result).toEqual(mockResponse);
    });

    it('returns invited false for uninvited email', async () => {
      mock.onGet('/auth/invitations').reply(200, { email: 'unknown@example.com', invited: false });

      const result = await checkInvite('unknown@example.com');

      expect(result.invited).toBe(false);
    });
  });

  describe('fetchCurrentUser()', () => {
    it('calls the correct endpoint', async () => {
      mock.onGet('/users/me').reply(200, mockUser);

      await fetchCurrentUser();

      expect(mock.history.get[0].url).toBe('/users/me');
    });

    it('returns the user object', async () => {
      mock.onGet('/users/me').reply(200, mockUser);

      const result = await fetchCurrentUser();

      expect(result).toEqual(mockUser);
    });
  });

  describe('resetPassword()', () => {
    it('calls the correct endpoint with the email', async () => {
      mock.onPost('/auth/password-reset').reply(200);

      await resetPassword('jane@example.com');

      expect(mock.history.post[0].url).toBe('/auth/password-reset');
      expect(JSON.parse(mock.history.post[0].data)).toEqual({ email: 'jane@example.com' });
    });

    it('returns void on success', async () => {
      mock.onPost('/auth/password-reset').reply(200);

      const result = await resetPassword('jane@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('confirmPasswordReset()', () => {
    it('calls PUT on the correct endpoint with the token and new password', async () => {
      mock.onPut('/auth/password-reset').reply(200);

      await confirmPasswordReset('reset-token', 'NewPassword1!');

      expect(mock.history.put[0].url).toBe('/auth/password-reset');
      expect(JSON.parse(mock.history.put[0].data)).toEqual({
        token: 'reset-token',
        newPassword: 'NewPassword1!',
      });
    });

    it('returns void on success', async () => {
      mock.onPut('/auth/password-reset').reply(200);

      const result = await confirmPasswordReset('reset-token', 'NewPassword1!');

      expect(result).toBeUndefined();
    });

    it('throws when the token is invalid or expired', async () => {
      mock.onPut('/auth/password-reset').reply(403, {
        status: 403,
        error: 'INVALID_TOKEN',
        message: 'Reset token already used or invalid',
        details: [],
      });

      await expect(confirmPasswordReset('bad-token', 'NewPassword1!')).rejects.toThrow();
    });
  });

  describe('logout()', () => {
    it('removes the token cookie', () => {
      logout();

      expect(Cookies.remove).toHaveBeenCalledWith('auth_token');
    });
  });
});
