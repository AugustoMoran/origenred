import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
});

let refreshPromise: Promise<boolean> | null = null;

type RefreshApi = Pick<BaseQueryApi, 'getState' | 'dispatch'>;

export function isAccessTokenExpired(token: string | null, bufferSeconds = 90): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.exp) return true;
    return payload.exp * 1000 <= Date.now() + bufferSeconds * 1000;
  } catch {
    return true;
  }
}

export async function tryRefreshSession(
  api: RefreshApi,
  options: { logoutOnFail?: boolean } = {}
): Promise<boolean> {
  const { logoutOnFail = true } = options;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshResult = await refreshBaseQuery(
      { url: '/auth/refresh', method: 'POST' },
      api as BaseQueryApi,
      {}
    );

    const newAccess = (refreshResult.data as any)?.access;
    const currentUser = (api.getState() as any)?.auth?.user;

    if (newAccess && currentUser) {
      api.dispatch(setCredentials({ user: currentUser, token: newAccess }));
      return true;
    }

    if (logoutOnFail) {
      api.dispatch(logout());
    }
    return false;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export function createReauthBaseQuery(
  baseUrl: string
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const baseQuery = fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      const refreshed = await tryRefreshSession(api);
      if (refreshed) {
        result = await baseQuery(args, api, extraOptions);
      }
    }

    return result;
  };
}

export async function bootstrapAuthSession(store: {
  getState: () => unknown;
  dispatch: RefreshApi['dispatch'];
}): Promise<void> {
  const { user, token } = (store.getState() as any)?.auth || {};
  if (!user || !token) return;
  if (!isAccessTokenExpired(token, 120)) return;

  await tryRefreshSession(
    { getState: store.getState as RefreshApi['getState'], dispatch: store.dispatch },
    { logoutOnFail: isAccessTokenExpired(token, 0) }
  );
}
