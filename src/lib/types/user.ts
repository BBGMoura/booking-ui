export interface UpdateUserInfoRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface UpdateCredentialsRequest {
  password: string;
}
