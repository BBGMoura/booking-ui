import Cookies from 'js-cookie';
import { UpdateUserInfoRequest, UpdateCredentialsRequest } from '@/lib/types/user';
import type { User, AuthResponse } from '@/lib/types/auth';
import { TOKEN_KEY } from '@/lib/api/auth';
import api from '@/lib/api/axiosInstance';

export async function updateUserInfo(data: UpdateUserInfoRequest): Promise<User> {
  const response = await api.patch<User>('/users/me', data);
  return response.data;
}

export async function updateCredentials(data: UpdateCredentialsRequest): Promise<void> {
  const { data: response } = await api.put<AuthResponse>('/users/me/password', data);
  Cookies.set(TOKEN_KEY, response.token, { expires: 1 });
}
