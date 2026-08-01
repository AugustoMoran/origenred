import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/inventory`),
  tagTypes: ['Product', 'BranchStock'],
  endpoints: (builder) => ({
    getProducts: builder.query<any[], { search?: string; category?: string; supplier?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.search) search.set('search', params.search);
        if (params?.category) search.set('category', params.category);
        if (params?.supplier) search.set('supplier', params.supplier);
        return search.toString() ? `?${search.toString()}` : '';
      },
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
        formData: true,
      }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
        formData: true,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    adjustStock: builder.mutation({
      query: ({ id, quantity, type }) => ({
        url: `/${id}/stock`,
        method: 'PATCH',
        body: { quantity, type },
      }),
      invalidatesTags: ['Product'],
    }),
    // Nuevos endpoints de Stock
    manualAdjust: builder.mutation({
      query: (body) => ({
        url: '/../stock/adjust',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Product',
        { type: 'BranchStock', id: arg?.productId },
      ],
    }),
    getProductStockByBranch: builder.query<any[], string>({
      query: (productId) => `/../stock/product/${productId}`,
      providesTags: (_result, _error, productId) => [{ type: 'BranchStock', id: productId }],
    }),
    previewBulkCostUpdate: builder.mutation<any, any>({
      query: (body) => ({
        url: '/bulk/cost-update',
        method: 'POST',
        body: {
          ...body,
          dryRun: true,
        },
      }),
    }),
    applyBulkCostUpdate: builder.mutation<any, any>({
      query: (body) => ({
        url: '/bulk/cost-update',
        method: 'POST',
        body: {
          ...body,
          dryRun: false,
        },
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const { 
  useGetProductsQuery, 
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useDeleteProductMutation,
  useAdjustStockMutation,
  useManualAdjustMutation,
  useGetProductStockByBranchQuery,
  usePreviewBulkCostUpdateMutation,
  useApplyBulkCostUpdateMutation,
} = inventoryApi;
