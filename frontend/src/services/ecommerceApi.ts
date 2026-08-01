import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/ecommerce`),
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
