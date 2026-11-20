import Cookies from 'js-cookie';
import type {
  UpdateUserInfoRequest,
  UpdateCredentialsRequest,
  UserProfile,
  GetUsersParams,
  InviteUserRequest,
} from '@/lib/types/user';
import type { Page } from '@/lib/types/booking';
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

export async function getUsers(params: GetUsersParams = {}): Promise<Page<UserProfile>> {
  const { data } = await api.get<Page<UserProfile>>('/admin/users', { params });
  return data;
}

export async function inviteUser(request: InviteUserRequest): Promise<void> {
  await api.post('/admin/users/invite', request);
}
