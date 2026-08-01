import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/afip`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }: any) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
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

export const afipApi = createApi({
  reducerPath: 'afipApi',
  baseQuery: baseQueryWithReauth,
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
