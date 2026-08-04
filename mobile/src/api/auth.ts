import { apiFetch } from './client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const login = (email: string, password: string) =>
  apiFetch<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, client: 'mobile' }),
  });

export const refreshSession = (refreshToken: string) =>
  apiFetch<AuthSession>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken, client: 'mobile' }),
  });

export const getMe = (token: string) =>
  apiFetch<AuthUser>('/auth/me', { token, mobile: false });

export const logout = (refreshToken: string) =>
  apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    mobile: false,
  });

export const registerPushToken = (token: string, platform: string, accessToken: string) =>
  apiFetch<{ ok: boolean }>('/auth/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
    token: accessToken,
    mobile: false,
  });
