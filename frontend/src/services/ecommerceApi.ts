import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/ecommerce`,
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

export interface StoreProduct {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  sku: string;
  stock: number;
  featured?: boolean;
  paused?: boolean;
  iva?: number;
}

export interface StoreOrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  items: StoreOrderItem[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
  notes?: string;
  paymentMethod?: string;
}

export const ecommerceApi = createApi({
  reducerPath: 'ecommerceApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['StoreProduct', 'StoreOrder', 'StoreCategory'],
  endpoints: (builder) => ({
    getStoreProducts: builder.query<
      StoreProduct[],
      { search?: string; category?: string; featured?: boolean } | void
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.search) search.set('search', params.search);
        if (params?.category) search.set('category', params.category);
        if (params?.featured) search.set('featured', 'true');
        const suffix = search.toString() ? `?${search.toString()}` : '';
        return `/products${suffix}`;
      },
      providesTags: ['StoreProduct'],
    }),
    getStoreProduct: builder.query<StoreProduct, string>({
      query: (idOrSlug) => `/products/${idOrSlug}`,
      providesTags: (_result, _error, id) => [{ type: 'StoreProduct', id }],
    }),
    getStoreCategories: builder.query<{ _id: string; name: string }[], void>({
      query: () => '/categories',
      providesTags: ['StoreCategory'],
    }),
    createStoreOrder: builder.mutation<any, CreateOrderPayload>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['StoreOrder', 'StoreProduct'],
    }),
    getStoreOrder: builder.query<any, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'StoreOrder', id }],
    }),
  }),
});

export const {
  useGetStoreProductsQuery,
  useGetStoreProductQuery,
  useGetStoreCategoriesQuery,
  useCreateStoreOrderMutation,
  useGetStoreOrderQuery,
} = ecommerceApi;
