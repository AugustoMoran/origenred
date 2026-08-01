import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const afipApi = createApi({
  reducerPath: 'afipApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/afip`),
  tagTypes: ['Taxpayer'],
  endpoints: (builder) => ({
    getTaxpayer: builder.query<any, string>({
      query: (cuit) => `/taxpayer/${cuit}`,
      transformResponse: (response: any) => {
        if (response && typeof response.found === 'boolean') {
          if (response.data) {
            return {
              ...response.data,
              _message: response.message,
              _found: response.found,
            };
          }
          return {
            cuit: '',
            nombre: '',
            razonSocial: '',
            fiscalCondition: '',
            suggestedInvoiceType: 'B',
            _notFound: true,
            _found: response.found,
            _message: response.message,
            _afipAuthError: Boolean(response.ok === false && response.message),
          };
        }
        return response;
      },
      providesTags: ['Taxpayer'],
    }),
    getAfipStatus: builder.query<any, void>({
      query: () => '/status',
    }),
  }),
});

export const { useGetTaxpayerQuery, useLazyGetTaxpayerQuery, useGetAfipStatusQuery } = afipApi;
