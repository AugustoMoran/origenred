const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const getApiBaseUrl = () => API_URL;
export const getSocketUrl = () => API_URL.replace(/\/api\/?$/, '');

type FetchOptions = RequestInit & { token?: string; mobile?: boolean };

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, mobile = true, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (mobile) headers['X-OrigenRed-Client'] = 'mobile';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `Error ${res.status}`);
  }

  return data as T;
}
