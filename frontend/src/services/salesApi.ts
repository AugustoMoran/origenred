import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/sales`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth.token;
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

export const salesApi = createApi({
  reducerPath: 'salesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Sale'],
  endpoints: (builder) => ({
    getSales: builder.query<any[], void>({
      query: () => '/',
      providesTags: ['Sale'],
    }),
    getCreditNotes: builder.query<any[], { saleId?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.saleId) search.set('saleId', params.saleId);
        const suffix = search.toString() ? `?${search.toString()}` : '';
        return `/credit-notes${suffix}`;
      },
      providesTags: ['Sale'],
    }),
    getSaleById: builder.query<any, string>({
      query: (id) => `/${id}`,
      providesTags: ['Sale'],
    }),
    createSale: builder.mutation({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Sale'],
    }),
    updateSale: builder.mutation({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Sale'],
    }),
    deleteSale: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Sale'],
    }),
    createCreditNote: builder.mutation({
      query: (body) => ({
        url: '/credit-notes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Sale'],
    }),
    getSaleInvoice: builder.query<Blob, string>({
      query: (id) => ({
        url: `/${id}/download`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getSaleRemito: builder.query<Blob, { id: string; mode?: 'logistico' | 'comercial' }>({
      query: ({ id, mode = 'logistico' }: { id: string; mode?: 'logistico' | 'comercial' }) => ({
        url: `/${id}/remito?mode=${mode}`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getProfitReport: builder.query<any, { from?: string; to?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.from) search.set('from', params.from);
        if (params?.to) search.set('to', params.to);
        const suffix = search.toString() ? `?${search.toString()}` : '';
        return `/profit-report${suffix}`;
      },
      providesTags: ['Sale'],
    }),
  }),
});

export const {
  useGetSalesQuery,
  useGetCreditNotesQuery,
  useGetSaleByIdQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useCreateCreditNoteMutation,
  useLazyGetSaleInvoiceQuery,
  useLazyGetSaleRemitoQuery,
  useGetProfitReportQuery,
} = salesApi;
