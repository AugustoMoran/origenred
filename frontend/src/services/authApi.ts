import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }: any) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: 'login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: 'register',
        method: 'POST',
        body: userData,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: 'logout',
        method: 'POST',
      }),
    }),
    refresh: builder.mutation<{ access: string }, void>({
      query: () => ({
        url: 'refresh',
        method: 'POST',
      }),
    }),
    getUsers: builder.query<any[], void>({
      query: () => 'users',
      providesTags: ['Users' as any],
    }),
    updatePermissions: builder.mutation({
      query: (data) => ({
        url: 'users/permissions',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Users' as any],
    }),
  }),
});

export const { 
  useLoginMutation, 
  useRegisterMutation, 
  useLogoutMutation,
  useRefreshMutation,
  useGetUsersQuery,
  useUpdatePermissionsMutation
} = authApi;