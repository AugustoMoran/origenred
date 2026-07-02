import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const afipApi = createApi({
  reducerPath: 'afipApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL || ''}/api/afip`,
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
