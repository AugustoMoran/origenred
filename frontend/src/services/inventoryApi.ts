import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/inventory`,
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

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery: baseQueryWithReauth,
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
