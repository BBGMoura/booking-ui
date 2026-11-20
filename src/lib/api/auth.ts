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

let unauthorizedHandler: (() => void) | null = null;
let sessionExpiryHandled = false;

/**
 * Registers the function called once when the session expires (a 401 on a request made with a
 * token). AuthProvider uses it to clear the user and send them to the login page.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
  if (!handler) sessionExpiryHandled = false;
}

function isLoginRequest(url?: string): boolean {
  return url?.endsWith('/auth/login') ?? false;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status !== 401 || isLoginRequest(error.config?.url)) {
      return Promise.reject(error);
    }

    if (Cookies.get(TOKEN_KEY)) {
      Cookies.remove(TOKEN_KEY);
      sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');
      sessionExpiryHandled = true;
      unauthorizedHandler?.();
    }

    // The user is being sent to /login, so requests that fail with the same expired token never
    // settle. Rejecting them would flash error states and toasts on the page being left.
    if (sessionExpiryHandled && unauthorizedHandler) {
      return new Promise(() => {});
    }
    return Promise.reject(error);
  }
);

export async function login(credentials: LoginCredentials): Promise<void> {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  Cookies.set(TOKEN_KEY, data.token, { expires: 1 });
  sessionExpiryHandled = false;
}

export async function register(registerData: RegisterData): Promise<User> {
  const { data } = await api.post<RegisterResponse>('/auth/register', registerData);

  Cookies.set(TOKEN_KEY, data.token, { expires: 1 });
  sessionExpiryHandled = false;

  const { token, ...user } = data;
  return user as User;
}

export async function checkInvite(email: string): Promise<CheckInviteResponse> {
  const { data } = await api.get<CheckInviteResponse>('/auth/invitations', {
    params: { email },
  });
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/users/me');
  return data;
}

export async function resetPassword(email: string): Promise<void> {
  await api.post('/auth/password-reset', { email });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await api.put('/auth/password-reset', { token, newPassword });
}

export function logout(): void {
  Cookies.remove(TOKEN_KEY);
}
