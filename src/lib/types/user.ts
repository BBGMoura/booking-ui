export interface UpdateUserInfoRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface UpdateCredentialsRequest {
  email?: string;
  password?: string;
}

export interface UserInfoResponse {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}
