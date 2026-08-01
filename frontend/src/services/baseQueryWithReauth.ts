import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setUser, AuthUser } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
});

const meBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/auth`,
  credentials: 'include',
});

let refreshPromise: Promise<boolean> | null = null;

type RefreshApi = Pick<BaseQueryApi, 'getState' | 'dispatch'>;

const applyUser = (api: RefreshApi, user: AuthUser | undefined) => {
  if (!user) return false;
  api.dispatch(setUser(user));
  return true;
};

export async function fetchCurrentUser(api: RefreshApi): Promise<boolean> {
  const result = await meBaseQuery({ url: '/me', method: 'GET' }, api as BaseQueryApi, {});
  return applyUser(api, result.data as AuthUser | undefined);
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

    const user = (refreshResult.data as any)?.user as AuthUser | undefined;
    if (applyUser(api, user)) {
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
  try {
    localStorage.removeItem('facturaapp_auth');
  } catch {
    // no-op
  }

  const api: RefreshApi = {
    getState: store.getState as RefreshApi['getState'],
    dispatch: store.dispatch,
  };

  const hasSession = await fetchCurrentUser(api);
  if (hasSession) return;

  const refreshed = await tryRefreshSession(api, { logoutOnFail: false });
  if (refreshed) {
    await fetchCurrentUser(api);
    return;
  }

  const { isAuthenticated } = (store.getState() as any)?.auth || {};
  if (isAuthenticated) {
    store.dispatch(logout());
  }
}
