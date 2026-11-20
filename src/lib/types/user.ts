import type { UserRole } from '@/lib/types/auth';

export interface UpdateUserInfoRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface UpdateCredentialsRequest {
  password: string;
}

/**
 * A user as returned by GET /admin/users. Matches the backend's UserProfile.
 * Someone who has been invited but hasn't registered has no names or phone number.
 */
export interface UserProfile {
  uid: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  enabled: boolean;
  role: UserRole;
}

export interface GetUsersParams {
  page?: number;
  size?: number;
  search?: string;
}

/** Body of POST /admin/users/invite. */
export interface InviteUserRequest {
  email: string;
  role: UserRole;
}
