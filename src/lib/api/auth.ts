import Cookies from 'js-cookie';
import type {
  User,
  AuthResponse,
  RegisterResponse,
  RegisterData,
  LoginCredentials,
  CheckInviteResponse,
} from '@/lib/types/auth';
import api from '@/lib/api/axiosInstance';

export const TOKEN_KEY = 'auth_token';
export const SESSION_EXPIRED_KEY = 'session_expired';

api.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && Cookies.get(TOKEN_KEY)) {
      Cookies.remove(TOKEN_KEY);
      sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');
    }
    return Promise.reject(error);
  }
);

export async function login(credentials: LoginCredentials): Promise<void> {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  Cookies.set(TOKEN_KEY, data.token, { expires: 1 });
}

export async function register(registerData: RegisterData): Promise<User> {
  const { data } = await api.post<RegisterResponse>('/auth/register', registerData);

  Cookies.set(TOKEN_KEY, data.token, { expires: 1 });

  const { token, userInfoId, ...user } = data;
  return user as User;
}

export async function checkInvite(email: string): Promise<CheckInviteResponse> {
  const { data } = await api.get<CheckInviteResponse>('/auth/check-invite', {
    params: { email },
  });
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/user');
  return data;
}

export async function resetPassword(email: string): Promise<void> {
  await api.patch('/password/reset', { email });
}

export function logout(): void {
  Cookies.remove(TOKEN_KEY);
}
