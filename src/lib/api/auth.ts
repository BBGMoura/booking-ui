import axios from 'axios';
import Cookies from 'js-cookie';
import type {
  User,
  AuthResponse,
  RegisterResponse,
  RegisterData,
  LoginCredentials,
  CheckInviteResponse
} from '@/lib/types/auth';

const TOKEN_KEY = 'auth_token';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

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
    if (error.response?.status === 401) {
      Cookies.remove(TOKEN_KEY);
      window.location.href = 'login';
    }
    return Promise.reject(error);
  }
);

export async function login(credentials: LoginCredentials): Promise<User> {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);

  Cookies.set(TOKEN_KEY, data.token, { expires: 1 });

  return getCurrentUser();
}

export async function register(registerData: RegisterData): Promise<User> {
  const { data } = await api.post<RegisterResponse>('/auth/register', registerData);

  Cookies.set(TOKEN_KEY, data.token, { expires: 1 });

  return {
    userId: data.userId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    enabled: data.enabled,
    role: data.role,
  };
}

export async function checkInvite(email: string): Promise<CheckInviteResponse> {
  const { data } = await api.get<CheckInviteResponse>("/auth/check-invite", {
    params: { email },
  });
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/user');
  return data;
}

export function logout(): void {
  Cookies.remove(TOKEN_KEY);
}


