import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const categoryApi = createApi({
  reducerPath: 'categoryApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/categories`),
  tagTypes: ['Category'],
  endpoints: (builder) => ({
    getCategories: builder.query<any[], void>({
      query: () => '/',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
