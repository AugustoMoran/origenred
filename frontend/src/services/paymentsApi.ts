import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/payments`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getMercadoPagoConfig: builder.query<{ publicKey: string; enabled: boolean }, void>({
      query: () => '/mercadopago/config',
    }),
    createPreference: builder.mutation<
      { id: string; initPoint: string; sandboxInitPoint?: string },
      { saleId: string; payerEmail?: string }
    >({
      query: (body) => ({
        url: '/mercadopago/preference',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGetMercadoPagoConfigQuery, useCreatePreferenceMutation } = paymentsApi;
