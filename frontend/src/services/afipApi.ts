import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const afipApi = createApi({
  reducerPath: 'afipApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/afip`,
    prepareHeaders: (headers, { getState }: any) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Taxpayer'],
  endpoints: (builder) => ({
    getTaxpayer: builder.query<any, string>({
      query: (cuit) => `/taxpayer/${cuit}`,
      providesTags: ['Taxpayer'],
    }),
    getAfipStatus: builder.query<any, void>({
      query: () => '/status',
    }),
  }),
});

export const { useGetTaxpayerQuery, useLazyGetTaxpayerQuery, useGetAfipStatusQuery } = afipApi;
// Redeploy forced 07/01/2026 23:40:15
