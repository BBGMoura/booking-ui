'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  fetchCurrentUser,
} from '@/lib/api/auth';
import type { User, LoginCredentials, RegisterData } from '@/lib/types/auth';

/**
 * AuthContext value provided to the entire app.
 * Access via the useAuth() hook in any component.
 *
 * @property user - The currently logged-in user, or null if nobody is logged in
 * @property isAuthenticated - Quick boolean to check if a user is logged in
 * @property isLoading - True during login/register API calls - use this for button loading states
 * @property isInitialising - True only on first app load while checking for an existing token
 * @property error - Error message from the last failed auth action, null if no error
 * @property login - Logs in a user with email and password, updates global auth state
 * @property logout - Clears the token cookie and resets auth state
 * @property register - Registers a new user and updates global auth state
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialising: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (user: RegisterData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Wraps the entire app and manages global authentication state.
 * Handles token validation on first load, login, logout, and registration.
 * Must be added to the root layout to make auth state available everywhere.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On first app load, attempts to fetch the current user using the stored cookie token.
  // If the token is missing, expired, or invalid, the user is set to null (not logged in).
  // Sets isInitialising to false when complete, which unblocks the app from rendering.
  useEffect(() => {
    async function checkExistingToken() {
      try {
        await fetchUser();
      } finally {
        setIsInitialising(false);
      }
    }

    checkExistingToken().catch();
  }, []);

  async function login(credentials: LoginCredentials): Promise<void> {
    try {
      setError(null);
      setIsLoading(true);
      const loggedInUser = await loginApi(credentials);
      setUser(loggedInUser);
    } catch {
      // TODO [BMS-6]: Replace with actual backend error message
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    logoutApi();
    setUser(null);
    setError(null);
  }

  async function register(data: RegisterData): Promise<void> {
    try {
      setError(null);
      setIsLoading(true);
      const user = await registerApi(data);
      setUser(user);
    } catch (error) {
      // TODO [BMS-7]: Replace with actual backend error message
      setError('Registration failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUser(): Promise<void> {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      setError(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitialising,
        error,
        login,
        logout,
        register,
      }}
    >
      {isInitialising ? null : children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
