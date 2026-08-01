import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface AnalyticsEvent {
  event: string;
  path?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/analytics`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
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

export const { useTrackEventMutation } = analyticsApi;
