import {
  UpdateUserInfoRequest,
  UpdateCredentialsRequest,
  UserInfoResponse,
} from '@/lib/types/user';
import api from '@/lib/api/axiosInstance';

export async function updateUserInfo(data: UpdateUserInfoRequest): Promise<UserInfoResponse> {
  const response = await api.patch<UserInfoResponse>('/users/me', data);
  return response.data;
}

export async function updateCredentials(data: UpdateCredentialsRequest): Promise<void> {
  await api.put('/users/me/credentials', data);
}
