import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface ProductAnalyticsRow {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  cost?: number;
  profit?: number;
}

export interface OverviewAnalytics {
  range: { from: string; to: string };
  sales: { totalCount: number; totalRevenue: number; avgTicket: number };
  topByQuantity: ProductAnalyticsRow[];
  topByProfit: ProductAnalyticsRow[];
}

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
});

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/analytics`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth?.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshResult = await refreshBaseQuery(
      { url: '/auth/refresh', method: 'POST' },
      api,
      extraOptions
    );

    const newAccess = (refreshResult.data as any)?.access;
    const currentUser = (api.getState() as any)?.auth?.user;

    if (newAccess && currentUser) {
      api.dispatch(setCredentials({ user: currentUser, token: newAccess }));
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export interface AnalyticsEvent {
  event: string;
  path?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['OverviewAnalytics'],
  endpoints: (builder) => ({
    getOverviewAnalytics: builder.query<OverviewAnalytics, { from?: string; to?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.from) search.set('from', params.from);
        if (params?.to) search.set('to', params.to);
        const suffix = search.toString() ? `?${search.toString()}` : '';
        return `/overview${suffix}`;
      },
      providesTags: ['OverviewAnalytics'],
    }),
    trackEvent: builder.mutation<void, AnalyticsEvent>({
      query: (body) => ({
        url: '/events',
        method: 'POST',
        body: {
          ...body,
          timestamp: new Date().toISOString(),
        },
      }),
    }),
  }),
});

export const { useGetOverviewAnalyticsQuery, useTrackEventMutation } = analyticsApi;
