import MockAdapter from 'axios-mock-adapter';
import Cookies from 'js-cookie';
import { login, register, checkInvite, fetchCurrentUser, logout, api } from '@/lib/api/auth';
import { LoginCredentials, RegisterData, User } from '@/lib/types/auth';

const mockUser: User = {
  userId: 1,
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
  userId: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  userInfoId: 10,
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
});

afterEach(() => {
  mock.reset();
  Cookies.remove('auth_token');
  jest.clearAllMocks();
});

describe('auth API', () => {
  describe('request interceptor', () => {
    it('attaches Authorization header when token exists in cookie', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockToken);
      mock.onGet('/user').reply(200, mockUser);

      await fetchCurrentUser();

      expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('does not attach Authorization header when no token exists', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      mock.onGet('/user').reply(200, mockUser);

      await fetchCurrentUser();

      expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
    });
  });

  describe('login()', () => {
    it('calls the correct endpoint with credentials', async () => {
      mock.onPost('/auth/login').reply(200, { token: mockToken });
      mock.onGet('/user').reply(200, mockUser);

      await login(mockLoginCredentials);

      expect(mock.history.post[0].url).toBe('/auth/login');
      expect(JSON.parse(mock.history.post[0].data)).toEqual(mockLoginCredentials);
    });

    it('stores the token in a cookie after login', async () => {
      mock.onPost('/auth/login').reply(200, { token: mockToken });
      mock.onGet('/user').reply(200, mockUser);

      await login(mockLoginCredentials);

      expect(Cookies.set).toHaveBeenCalledWith('auth_token', mockToken, { expires: 1 });
    });

    it('returns the user object', async () => {
      mock.onPost('/auth/login').reply(200, { token: mockToken });
      mock.onGet('/user').reply(200, mockUser);

      const result = await login(mockLoginCredentials);

      expect(result).toEqual(mockUser);
    });

    it('throws an error if the backend returns an error', async () => {
      mock.onPost('/auth/login').reply(401);

      await expect(login(mockLoginCredentials)).rejects.toThrow();
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
      mock.onGet('/auth/check-invite').reply(200, { email: 'jane@example.com', invited: true });

      await checkInvite('jane@example.com');

      expect(mock.history.get[0].url).toBe('/auth/check-invite');
      expect(mock.history.get[0].params).toEqual({ email: 'jane@example.com' });
    });

    it('returns the full check invite response', async () => {
      const mockResponse = { email: 'jane@example.com', invited: true };
      mock.onGet('/auth/check-invite').reply(200, mockResponse);

      const result = await checkInvite('jane@example.com');

      expect(result).toEqual(mockResponse);
    });

    it('returns invited false for uninvited email', async () => {
      mock.onGet('/auth/check-invite').reply(200, { email: 'unknown@example.com', invited: false });

      const result = await checkInvite('unknown@example.com');

      expect(result.invited).toBe(false);
    });
  });

  describe('fetchCurrentUser()', () => {
    it('calls the correct endpoint', async () => {
      mock.onGet('/user').reply(200, mockUser);

      await fetchCurrentUser();

      expect(mock.history.get[0].url).toBe('/user');
    });

    it('returns the user object', async () => {
      mock.onGet('/user').reply(200, mockUser);

      const result = await fetchCurrentUser();

      expect(result).toEqual(mockUser);
    });
  });

  describe('logout()', () => {
    it('removes the token cookie', () => {
      Cookies.set('auth_token', mockToken);

      logout();

      expect(Cookies.remove).toHaveBeenCalledWith('auth_token');
    });
  });
});
