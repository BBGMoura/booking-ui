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
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}
