/**
 * Authentication Types
 * All types for authentication flow
 */

/**
 * User roles enum-like object
 */
export const USER_ROLES = {
  ADMIN: 'ROLE_ADMIN',
  USER: 'ROLE_USER',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Helper: Check if a string is a valid role
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole);
}

/**
 * Helper: Get all available roles
 */
export function getAllRoles(): UserRole[] {
  return Object.values(USER_ROLES);
}

/**
 * User
 * Matches backend UserProfile
 */
export interface User {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  enabled: boolean;
  role: UserRole;
}

/**
 * Login credentials
 * Matches backend AuthenticationRequest
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration form data
 * Matches backend RegisterRequest
 * All values required
 */
export interface RegisterData {
  firstName: string;
  lastName: string;
  /**
   * Email address
   * Format: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
   */
  email: string;
  /**
   * Phone number
   * Format: ^0\d{9,10}$ (e.g., 07112233445)
   */
  phoneNumber: string;
  /**
   * Password
   * Must be 8-16 chars with:
   * - At least one lowercase letter
   * - At least one uppercase letter
   * - At least one digit
   * - At least one special character: !@#$£%^&+=?'~:;/.,*(){}
   */
  password: string;
}

/**
 * Login response
 * Contains JWT token
 */
export interface AuthResponse {
  token: string;
}

/**
 * Registration response
 * Contains JWT token & full user details
 */
export interface RegisterResponse {
  token: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userInfoId: number;
  role: UserRole;
  enabled: boolean;
}

/**
 * Check invite response
 */
export interface CheckInviteResponse {
  email: string;
  invited: boolean;
}