import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface PublicStoreSettings {
  storeName: string;
  storeDescription?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  showPrices?: boolean;
}

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/settings`,
    credentials: 'include',
  }),
  tagTypes: ['Settings'],
  endpoints: (builder) => ({
    getPublicSettings: builder.query<PublicStoreSettings, void>({
      query: () => '/public',
      providesTags: ['Settings'],
    }),
  }),
});

export const { useGetPublicSettingsQuery } = settingsApi;
