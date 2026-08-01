import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/payments`),
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
