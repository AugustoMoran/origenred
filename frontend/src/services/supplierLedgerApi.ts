import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const supplierLedgerApi = createApi({
  reducerPath: 'supplierLedgerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/supplier-ledger`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }: any) => {
      const token = getState().auth.token;
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['SupplierLedger'],
  endpoints: (builder) => ({
    getLedgerEntries: builder.query<any, { from?: string; to?: string; supplierId?: string; q?: string; entryType?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.from) search.set('from', params.from);
        if (params?.to) search.set('to', params.to);
        if (params?.supplierId) search.set('supplierId', params.supplierId);
        if (params?.q) search.set('q', params.q);
        if (params?.entryType) search.set('entryType', params.entryType);
        const suffix = search.toString() ? `?${search.toString()}` : '';
        return `/entries${suffix}`;
      },
      providesTags: ['SupplierLedger'],
    }),
    getBalanceBySupplier: builder.query<any, void>({
      query: () => '/balance-by-supplier',
      providesTags: ['SupplierLedger'],
    }),
    createLedgerEntry: builder.mutation<any, any>({
      query: (body) => ({ url: '/entries', method: 'POST', body }),
      invalidatesTags: ['SupplierLedger'],
    }),
    updateLedgerEntry: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `/entries/${id}`, method: 'PUT', body }),
      invalidatesTags: ['SupplierLedger'],
    }),
    deleteLedgerEntry: builder.mutation<any, string>({
      query: (id) => ({ url: `/entries/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SupplierLedger'],
    }),
  }),
});

export const {
  useGetLedgerEntriesQuery,
  useGetBalanceBySupplierQuery,
  useCreateLedgerEntryMutation,
  useUpdateLedgerEntryMutation,
  useDeleteLedgerEntryMutation,
} = supplierLedgerApi;
