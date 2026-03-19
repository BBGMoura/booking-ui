'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  fetchCurrentUser,
  TOKEN_KEY,
} from '@/lib/api/auth';
import type { User, LoginCredentials, RegisterData, UserRole } from '@/lib/types/auth';
import Cookies from 'js-cookie';

/**
 * AuthContext value provided to the entire app.
 * Access via the useAuth() hook in any component.
 *
 * @property user - The currently logged-in user, or null if nobody is logged in
 * @property isAuthenticated - Quick boolean to check if a user is logged in
 * @property isLoading - True during login/register API calls - use this for button loading states
 * @property isInitialising - True only on first app load while checking for an existing token
 * @property login - Logs in a user with email and password, updates global auth state
 * @property logout - Clears the token cookie and resets auth state
 * @property register - Registers a new user and updates global auth state
 */
interface AuthContextType {
  user: User | null;
  hasRole: (role: UserRole) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialising: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (user: RegisterData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
export { AuthContext };

/**
 * Wraps the entire app and manages global authentication state.
 * Handles token validation on first load, login, logout, and registration.
 * Must be added to the root layout to make auth state available everywhere.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);

  useEffect(() => {
    async function initialise() {
      if (Cookies.get(TOKEN_KEY)) {
        try {
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
        } catch {
          // token expired or invalid — user stays null
        }
      }
      setIsInitialising(false);
    }

    void initialise();
  }, []);

  async function login(credentials: LoginCredentials): Promise<void> {
    setIsLoading(true);
    try {
      await loginApi(credentials);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    logoutApi();
    setUser(null);
  }

  async function register(data: RegisterData): Promise<void> {
    setIsLoading(true);
    try {
      const registeredUser = await registerApi(data);
      setUser(registeredUser);
    } finally {
      setIsLoading(false);
    }
  }

  function hasRole(role: UserRole): boolean {
    if (!user) return false;
    return user.role === role;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        hasRole,
        isAuthenticated: !!user,
        isLoading,
        isInitialising,
        login,
        logout,
        register,
      }}
    >
      {isInitialising ? null : children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access global authentication state and actions.
 * Must be used inside a component wrapped by AuthProvider.
 *
 * @example
 * const { user, isAuthenticated, isLoading, login, logout } = useAuth();
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
