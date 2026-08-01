import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/settings`,
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

export interface PublicStoreSettings {
  storeName: string;
  storeDescription?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  showPrices?: boolean;
  enableEcommerce?: boolean;
  minOrderAmount?: number;
  freeShippingThreshold?: number;
  defaultShippingCost?: number;
  mercadopagoEnabled?: boolean;
  envioPackEnabled?: boolean;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  bannerImages?: string[];
}

export interface AdminStoreSettings extends PublicStoreSettings {
  usingDefaultBanners?: boolean;
}

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Settings'],
  endpoints: (builder) => ({
    getPublicSettings: builder.query<PublicStoreSettings, void>({
      query: () => '/public',
      providesTags: ['Settings'],
    }),
    getAdminSettings: builder.query<AdminStoreSettings, void>({
      query: () => '/',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation<AdminStoreSettings, Partial<AdminStoreSettings>>({
      query: (body) => ({
        url: '/',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Settings'],
    }),
    uploadBannerImages: builder.mutation<{ bannerImages: string[]; message: string }, FormData>({
      query: (formData) => ({
        url: '/banners',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Settings'],
    }),
    clearBannerImages: builder.mutation<{ bannerImages: string[]; message: string }, void>({
      query: () => ({
        url: '/banners',
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetPublicSettingsQuery,
  useGetAdminSettingsQuery,
  useUpdateSettingsMutation,
  useUploadBannerImagesMutation,
  useClearBannerImagesMutation,
} = settingsApi;
