import { renderHook, act, waitFor, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import * as authApi from '@/lib/api/auth';
import Cookies from 'js-cookie';
import { User, USER_ROLES } from '@/lib/types/auth';

jest.mock('@/lib/api/auth');
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;
const mockRegister = authApi.register as jest.MockedFunction<typeof authApi.register>;
const mockFetchCurrentUser = authApi.fetchCurrentUser as jest.MockedFunction<
  typeof authApi.fetchCurrentUser
>;

const mockUser: User = {
  userId: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: 'ROLE_USER',
};

const mockLoginCredentials = {
  email: 'jane@example.com',
  password: 'Password1!',
};

const mockRegisterData = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  password: 'Password1!',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  // Default — no cookie, no user
  (Cookies.get as jest.Mock).mockReturnValue(undefined);
  mockFetchCurrentUser.mockRejectedValue(new Error('No token'));
});

describe('AuthContext', () => {
  describe('initialisation', () => {
    it('starts with no user and finishes initialising', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('restores user from existing token on mount', async () => {
      (Cookies.get as jest.Mock).mockReturnValue('fake-token');
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('clears user if existing token is invalid', async () => {
      (Cookies.get as jest.Mock).mockReturnValue('expired-token');
      mockFetchCurrentUser.mockRejectedValue(new Error('Unauthorised'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('skips fetchCurrentUser when no cookie exists', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(mockFetchCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('login()', () => {
    it('updates user state on successful login', async () => {
      mockLogin.mockResolvedValue(undefined);
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('re-throws on failed login', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await expect(
        act(async () => {
          await result.current.login(mockLoginCredentials);
        })
      ).rejects.toThrow();
    });

    it('sets isLoading to true during login then false after', async () => {
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      act(() => {
        result.current.login(mockLoginCredentials);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('sets isLoading to false after failed login', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        try {
          await result.current.login(mockLoginCredentials);
        } catch {
          // expected re-throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('logout()', () => {
    it('clears user state on logout', async () => {
      mockLogin.mockResolvedValue(undefined);
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('calls the logout API function', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      act(() => {
        result.current.logout();
      });

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('register()', () => {
    it('updates user state on successful registration', async () => {
      mockRegister.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        await result.current.register(mockRegisterData);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('re-throws on failed registration', async () => {
      mockRegister.mockRejectedValue(new Error('Registration failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await expect(
        act(async () => {
          await result.current.register(mockRegisterData);
        })
      ).rejects.toThrow();
    });

    it('sets isLoading to true during registration then false after', async () => {
      mockRegister.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUser), 100))
      );

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      act(() => {
        result.current.register(mockRegisterData);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('sets isLoading to false after failed registration', async () => {
      mockRegister.mockRejectedValue(new Error('Registration failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        try {
          await result.current.register(mockRegisterData);
        } catch {
          // expected re-throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useAuth()', () => {
    it('throws if used outside of AuthProvider', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      );
    });

    it('renders children once initialisation is complete', async () => {
      render(
        <AuthProvider>
          <div>test child</div>
        </AuthProvider>
      );

      await waitFor(() => expect(screen.getByText('test child')).toBeInTheDocument());
    });
  });

  describe('hasRole()', () => {
    it('returns true when user has the specified role', async () => {
      (Cookies.get as jest.Mock).mockReturnValue('fake-token');
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.hasRole(USER_ROLES.USER)).toBe(true);
    });

    it('returns false when user does not have the specified role', async () => {
      (Cookies.get as jest.Mock).mockReturnValue('fake-token');
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.hasRole(USER_ROLES.ADMIN)).toBe(false);
    });

    it('returns false when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.hasRole(USER_ROLES.ADMIN)).toBe(false);
    });
  });

  describe('fetchUser()', () => {
    it('fetches and updates user in context', async () => {
      (Cookies.get as jest.Mock).mockReturnValue('fake-token');
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      const updatedUser = { ...mockUser, firstName: 'Updated' };
      mockFetchCurrentUser.mockResolvedValue(updatedUser);

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.user?.firstName).toBe('Updated');
    });

    it('updates isAuthenticated after fetchUser', async () => {
      (Cookies.get as jest.Mock).mockReturnValue('fake-token');
      mockFetchCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
