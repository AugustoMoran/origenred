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
  commercialDescription?: string;
  longDescription?: string;
  price: number;
  imageUrl?: string;
  gallery?: Array<{ url: string; alt?: string; publicId?: string }>;
  category: string;
  sku: string;
  stock: number;
  featured?: boolean;
  paused?: boolean;
  iva?: number;
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  seoTitle?: string;
  seoDescription?: string;
  displayOrder?: number;
}

export interface StoreOrderItem {
  productId: string;
  quantity: number;
}

export interface StoreProductsPage {
  items: StoreProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StoreProductsQuery {
  search?: string;
  category?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}
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
        search.set('limit', '100');
        const suffix = search.toString() ? `?${search.toString()}` : '';
        return `/catalog${suffix}`;
      },
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        return response?.items || [];
      },
      providesTags: ['StoreProduct'],
    }),
    getStoreProductsPage: builder.query<StoreProductsPage, StoreProductsQuery>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params.search) search.set('search', params.search);
        if (params.category) search.set('category', params.category);
        if (params.featured) search.set('featured', 'true');
        search.set('page', String(params.page || 1));
        search.set('limit', String(params.limit || 12));
        return `/catalog?${search.toString()}`;
      },
      providesTags: ['StoreProduct'],
    }),
    getStoreProduct: builder.query<StoreProduct, string>({
      query: (idOrSlug) => `/catalog/${idOrSlug}`,
      providesTags: (_result, _error, id) => [{ type: 'StoreProduct', id }],
    }),
    getStoreCategories: builder.query<{ _id: string; name: string }[], void>({
      query: () => '/catalog/categories',
      transformResponse: (response: any) => {
        if (!Array.isArray(response)) return [];
        return response.map((name: string) => ({ _id: name, name }));
      },
      providesTags: ['StoreCategory'],
    }),
    createStoreOrder: builder.mutation<any, CreateOrderPayload>({
      query: (body) => ({
        url: '/checkout',
        method: 'POST',
        body: {
          items: body.items,
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          customerPhone: body.customerPhone,
          shippingAddress: body.shippingAddress,
          notes: body.notes,
          paymentMethod: body.paymentMethod,
        },
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
  useGetStoreProductsPageQuery,
  useGetStoreProductQuery,
  useGetStoreCategoriesQuery,
  useCreateStoreOrderMutation,
  useGetStoreOrderQuery,
} = ecommerceApi;
