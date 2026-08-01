import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

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

export interface AnalyticsEvent {
  event: string;
  path?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/analytics`),
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
