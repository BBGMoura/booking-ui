import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as authApi from '@/lib/api/auth';
import type { User } from '@/lib/types/auth';

jest.mock('@/lib/api/auth');

const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;
const mockRegister = authApi.register as jest.MockedFunction<typeof authApi.register>;
const mockGetCurrentUser = authApi.getCurrentUser as jest.MockedFunction<
  typeof authApi.getCurrentUser
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

// Helper to render useAuth() inside AuthProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockRejectedValue(new Error('No token'));
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
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('clears user if existing token is invalid', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Unauthorised'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login()', () => {
    it('updates user state on successful login', async () => {
      mockLogin.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('sets error state on failed login', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Invalid email or password. Please try again.');
    });

    it('sets isLoading to true during login then false after', async () => {
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUser), 100))
      );

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      act(() => {
        result.current.login(mockLoginCredentials);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('clears previous error on new login attempt', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      mockLogin.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      // First login fails
      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.error).not.toBeNull();

      // Second login succeeds - error should be cleared
      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('logout()', () => {
    it('clears user state on logout', async () => {
      mockLogin.mockResolvedValue(mockUser);

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

    it('clears error state on logout', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.logout();
      });

      expect(result.current.error).toBeNull();
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

    it('sets error state on failed registration', async () => {
      mockRegister.mockRejectedValue(new Error('Email already exists'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialising).toBe(false));

      await act(async () => {
        try {
          await result.current.register(mockRegisterData);
        } catch {
          // register re-throws so we catch it here
        }
      });

      expect(result.current.error).toBe('Registration failed. Please try again.');
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
  });

  describe('useAuth()', () => {
    it('throws if used outside of AuthProvider', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      );
    });
  });
});
