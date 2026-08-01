import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const supplierApi = createApi({
  reducerPath: 'supplierApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/suppliers`),
  tagTypes: ['Supplier'],
  endpoints: (builder) => ({
    getSuppliers: builder.query<any[], void>({
      query: () => '/',
      providesTags: ['Supplier'],
    }),
    createSupplier: builder.mutation({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: builder.mutation({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Supplier'],
    }),
    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Supplier'],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = supplierApi;
