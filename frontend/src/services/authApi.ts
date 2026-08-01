import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { AuthUser } from '../store/authSlice';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth`,
    credentials: 'include',
  }),
  tagTypes: ['Users'],
  endpoints: (builder) => ({
    login: builder.mutation<{ user: AuthUser }, { email: string; password: string }>({
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
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({
        url: 'logout',
        method: 'POST',
      }),
    }),
    getMe: builder.query<AuthUser, void>({
      query: () => '/me',
    }),
    refresh: builder.mutation<{ user: AuthUser }, void>({
      query: () => ({
        url: 'refresh',
        method: 'POST',
      }),
    }),
    getUsers: builder.query<any[], void>({
      query: () => 'users',
      providesTags: ['Users'],
    }),
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (userId) => ({
        url: `users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),
    updatePermissions: builder.mutation({
      query: (data) => ({
        url: 'users/permissions',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),
    updateCommission: builder.mutation({
      query: (data) => ({
        url: 'users/commission',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),
    updateBranch: builder.mutation({
      query: (data) => ({
        url: 'users/branch',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useRefreshMutation,
  useGetUsersQuery,
  useDeleteUserMutation,
  useUpdatePermissionsMutation,
  useUpdateCommissionMutation,
  useUpdateBranchMutation,
} = authApi;
