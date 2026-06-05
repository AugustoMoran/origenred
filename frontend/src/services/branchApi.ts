import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const branchApi = createApi({
  reducerPath: 'branchApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/branches`,
    prepareHeaders: (headers, { getState }: any) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Branch'],
  endpoints: (builder) => ({
    getBranches: builder.query<any[], any>({
      query: () => '/',
      providesTags: ['Branch'],
    }),
    createBranch: builder.mutation({
      query: (newBranch) => ({
        url: '/',
        method: 'POST',
        body: newBranch,
      }),
      invalidatesTags: ['Branch'],
    }),
    updateBranch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Branch'],
    }),
    deleteBranch: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Branch'],
    }),
  }),
});

export const {
  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} = branchApi;