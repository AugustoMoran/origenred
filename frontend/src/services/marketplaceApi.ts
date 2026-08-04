import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface MarketplaceListing {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  stock: number;
  status?: string;
  images: Array<{ url: string; alt?: string; key?: string }>;
  brand?: string;
  color?: string;
  size?: string;
  freeShipping: boolean;
  allowPickup?: boolean;
  origenRankScore: number;
  salesCount: number;
  seller?: {
    _id: string;
    businessName: string;
    slug: string;
    reputationScore: number;
  };
  category?: {
    _id: string;
    name: string;
    slug: string;
  } | string;
}

export interface MarketplaceCategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  listingCount: number;
}

export interface SellerProfile {
  _id: string;
  businessName: string;
  slug: string;
  description?: string;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  province?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  reputationScore: number;
  totalSales: number;
  listingCount: number;
  mercadoPagoConnected: boolean;
  rejectionReason?: string;
  user?: { name: string; email: string };
}

export interface HomeData {
  featured: MarketplaceListing[];
  newest: MarketplaceListing[];
  bestsellers: MarketplaceListing[];
  categories: MarketplaceCategory[];
  integrations: Record<string, boolean>;
}

export const marketplaceApi = createApi({
  reducerPath: 'marketplaceApi',
  baseQuery: createReauthBaseQuery(`${API_BASE}/marketplace`),
  tagTypes: ['Home', 'Listings', 'Listing', 'Favorites', 'Seller', 'MyListings', 'Orders'],
  endpoints: (builder) => ({
    getHomeData: builder.query<HomeData, void>({
      query: () => '/home',
      providesTags: ['Home'],
    }),
    getListings: builder.query<
      { items: MarketplaceListing[]; pagination: { page: number; limit: number; total: number; pages: number } },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({ url: '/listings', params }),
      providesTags: ['Listings'],
    }),
    getListingBySlug: builder.query<MarketplaceListing, string>({
      query: (slug) => `/listings/${slug}`,
      providesTags: (_r, _e, slug) => [{ type: 'Listing', id: slug }],
    }),
    getCategories: builder.query<MarketplaceCategory[], { all?: boolean } | void>({
      query: (params) => ({ url: '/categories', params: params?.all ? { all: 'true' } : undefined }),
    }),
    getSellerBySlug: builder.query<
      {
        _id: string;
        businessName: string;
        slug: string;
        description?: string;
        province?: string;
        city?: string;
        reputationScore: number;
        totalSales: number;
        listingCount: number;
      },
      string
    >({
      query: (slug) => `/sellers/${slug}`,
    }),
    getIntegrations: builder.query<Record<string, unknown>, void>({
      query: () => '/integrations',
    }),
    quoteShipping: builder.mutation<
      { enabled: boolean; quotes: unknown[]; message?: string },
      { postalCode: string; province?: string; weightKg?: number }
    >({
      query: (body) => ({ url: '/shipping/quote', method: 'POST', body }),
    }),
    registerSeller: builder.mutation<
      { message: string },
      {
        email: string;
        password: string;
        name: string;
        businessName: string;
        province?: string;
        city?: string;
        postalCode?: string;
        phone?: string;
        description?: string;
      }
    >({
      query: (body) => ({ url: '/sellers/register', method: 'POST', body }),
    }),
    toggleFavorite: builder.mutation<{ favorited: boolean }, string>({
      query: (listingId) => ({ url: `/favorites/${listingId}`, method: 'POST' }),
      invalidatesTags: ['Favorites'],
    }),
    getFavorites: builder.query<Array<{ listing: MarketplaceListing }>, void>({
      query: () => '/favorites',
      providesTags: ['Favorites'],
    }),
    createReport: builder.mutation<
      { message: string },
      { listingId?: string; sellerId?: string; orderId?: string; reason: string; description?: string }
    >({
      query: (body) => ({ url: '/reports', method: 'POST', body }),
    }),
    getMySellerProfile: builder.query<SellerProfile, void>({
      query: () => '/seller/me',
      providesTags: ['Seller'],
    }),
    getMySellerListings: builder.query<MarketplaceListing[], void>({
      query: () => '/seller/listings',
      providesTags: ['MyListings'],
    }),
    createSellerListing: builder.mutation<MarketplaceListing, FormData>({
      query: (body) => ({ url: '/seller/listings', method: 'POST', body }),
      invalidatesTags: ['MyListings', 'Home', 'Listings'],
    }),
    updateSellerListing: builder.mutation<
      MarketplaceListing,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({ url: `/seller/listings/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['MyListings', 'Home', 'Listings'],
    }),
    deleteSellerListing: builder.mutation<{ deleted: boolean }, string>({
      query: (id) => ({ url: `/seller/listings/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MyListings', 'Home', 'Listings'],
    }),
    getMercadoPagoConnect: builder.query<{ url: string | null; enabled: boolean }, void>({
      query: () => '/seller/mercadopago/connect',
    }),

    // Admin marketplace
    getPendingSellers: builder.query<SellerProfile[], void>({
      query: () => '/admin/sellers/pending',
      providesTags: ['Seller'],
    }),
    getAllSellers: builder.query<SellerProfile[], void>({
      query: () => '/admin/sellers',
      providesTags: ['Seller'],
    }),
    updateSellerStatus: builder.mutation<
      SellerProfile,
      { id: string; status: string; rejectionReason?: string }
    >({
      query: ({ id, status, rejectionReason }) => ({
        url: `/admin/sellers/${id}/status`,
        method: 'PATCH',
        body: { status, rejectionReason },
      }),
      invalidatesTags: ['Seller'],
    }),
    getReports: builder.query<
      { reports: unknown[]; reasonLabels: Record<string, string> },
      { status?: string } | void
    >({
      query: (params) => ({ url: '/admin/reports', params: params?.status ? { status: params.status } : undefined }),
    }),
    resolveReport: builder.mutation<
      unknown,
      { id: string; status: string; resolution?: string }
    >({
      query: ({ id, status, resolution }) => ({
        url: `/admin/reports/${id}`,
        method: 'PATCH',
        body: { status, resolution },
      }),
    }),

    // Checkout
    previewCheckout: builder.mutation<
      {
        items: unknown[];
        bySeller: Array<{
          sellerId: string;
          sellerName: string;
          items: unknown[];
          productSubtotal: number;
          shippingCost: number;
          freeShipping: boolean;
        }>;
        subtotal: number;
        shippingTotal: number;
        commissionTotal: number;
        commissionPercent: number;
        total: number;
        mercadoPagoEnabled: boolean;
      },
      {
        items: Array<{ listingId: string; quantity: number }>;
        postalCode?: string;
        province?: string;
        shippingMethod?: 'delivery' | 'pickup';
      }
    >({
      query: (body) => ({ url: '/checkout/preview', method: 'POST', body }),
    }),
    createCheckout: builder.mutation<
      {
        order: { orderNumber: string; total: number; status: string; chatEnabled: boolean; items: unknown[] };
        payment: { id: string; initPoint: string; sandboxInitPoint?: string } | null;
        mercadoPagoEnabled: boolean;
      },
      {
        items: Array<{ listingId: string; quantity: number }>;
        guestEmail?: string;
        guestName?: string;
        guestPhone?: string;
        shippingAddress: {
          fullName: string;
          phone: string;
          street: string;
          city: string;
          province: string;
          postalCode: string;
          notes?: string;
        };
        shippingMethod?: 'delivery' | 'pickup';
      }
    >({
      query: (body) => ({ url: '/checkout', method: 'POST', body }),
    }),
    getOrder: builder.query<
      {
        orderNumber: string;
        total: number;
        status: string;
        chatEnabled: boolean;
        items: Array<{ title: string; quantity: number; subtotal: number; listing: string }>;
      },
      string
    >({
      query: (orderNumber) => `/orders/${orderNumber}`,
    }),
    getMyOrders: builder.query<unknown[], void>({
      query: () => '/orders',
      providesTags: ['Orders'],
    }),

    // Chat
    getMyConversations: builder.query<unknown[], void>({
      query: () => '/chat/conversations',
    }),
    getConversationMessages: builder.query<
      { conversation: any; messages: any[] },
      string
    >({
      query: (id) => `/chat/conversations/${id}/messages`,
    }),
    getChatByOrder: builder.query<
      { conversation: any; messages: any[] },
      string
    >({
      query: (orderNumber) => `/chat/order/${orderNumber}`,
    }),
    sendMessage: builder.mutation<
      any,
      { conversationId: string; body: string }
    >({
      query: ({ conversationId, body }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { body },
      }),
    }),
    getSellerOrders: builder.query<unknown[], void>({
      query: () => '/seller/orders',
      providesTags: ['Orders'],
    }),
    updateSellerOrder: builder.mutation<
      unknown,
      { orderNumber: string; status: 'shipped' | 'delivered'; trackingCode?: string }
    >({
      query: ({ orderNumber, status, trackingCode }) => ({
        url: `/seller/orders/${orderNumber}`,
        method: 'PATCH',
        body: { status, trackingCode },
      }),
      invalidatesTags: ['Orders'],
    }),
  }),
});

export const {
  useGetHomeDataQuery,
  useGetListingsQuery,
  useGetListingBySlugQuery,
  useGetCategoriesQuery,
  useGetSellerBySlugQuery,
  useGetIntegrationsQuery,
  useQuoteShippingMutation,
  useRegisterSellerMutation,
  useToggleFavoriteMutation,
  useGetFavoritesQuery,
  useCreateReportMutation,
  useGetMySellerProfileQuery,
  useGetMySellerListingsQuery,
  useCreateSellerListingMutation,
  useUpdateSellerListingMutation,
  useDeleteSellerListingMutation,
  useGetMercadoPagoConnectQuery,
  useGetPendingSellersQuery,
  useGetAllSellersQuery,
  useUpdateSellerStatusMutation,
  useGetReportsQuery,
  useResolveReportMutation,
  usePreviewCheckoutMutation,
  useCreateCheckoutMutation,
  useGetOrderQuery,
  useGetMyOrdersQuery,
  useGetMyConversationsQuery,
  useGetConversationMessagesQuery,
  useGetChatByOrderQuery,
  useSendMessageMutation,
  useGetSellerOrdersQuery,
  useUpdateSellerOrderMutation,
} = marketplaceApi;
