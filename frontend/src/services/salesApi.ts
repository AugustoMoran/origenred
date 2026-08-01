import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const salesApi = createApi({
  reducerPath: 'salesApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/sales`),
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
    invoiceSale: builder.mutation<any, string>({
      query: (id) => ({
        url: `/${id}/invoice`,
        method: 'POST',
      }),
      invalidatesTags: ['Sale'],
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
  useInvoiceSaleMutation,
} = salesApi;
