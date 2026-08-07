import { apiFetch } from './client';

export interface Listing {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  stock: number;
  freeShipping: boolean;
  origenRankScore: number;
  salesCount: number;
  images: Array<{ url: string }>;
  seller?: { businessName: string; slug: string; reputationScore?: number };
  status?: string;
  category?: string | { _id: string; name: string };
  brand?: string;
  color?: string;
  size?: string;
}

export interface HomeData {
  featured: Listing[];
  newest: Listing[];
  bestsellers: Listing[];
  categories: Array<{ _id: string; name: string; slug: string; icon?: string; listingCount: number }>;
}

export interface CheckoutPreview {
  subtotal: number;
  shippingTotal: number;
  commissionTotal: number;
  total: number;
  mercadoPagoEnabled: boolean;
}

export interface CheckoutResult {
  order: { orderNumber: string; total: number; status: string };
  payment: { initPoint: string; sandboxInitPoint?: string } | null;
  orders?: Array<{ orderNumber: string; total: number; status: string }>;
  payments?: Array<{ initPoint: string; sandboxInitPoint?: string }>;
  multiOrder?: boolean;
  mercadoPagoEnabled: boolean;
}

export interface ChatMessage {
  _id: string;
  body: string;
  createdAt: string;
  sender?: { _id: string; name: string };
}

export interface ChatData {
  conversation: { _id: string; order?: { orderNumber: string } };
  messages: ChatMessage[];
}

export const getHome = () => apiFetch<HomeData>('/marketplace/home', { mobile: false });

export const searchListings = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ items: Listing[]; pagination: { total: number } }>(
    `/marketplace/listings?${qs}`,
    { mobile: false }
  );
};

export const getListing = (slug: string) =>
  apiFetch<Listing>(`/marketplace/listings/${slug}`, { mobile: false });

export const getMyOrders = (token: string) =>
  apiFetch<MarketplaceOrder[]>('/marketplace/orders', { token, mobile: false });

export const getOrder = (orderNumber: string, token?: string) =>
  apiFetch<MarketplaceOrder>(`/marketplace/orders/${orderNumber}`, { token, mobile: false });

export const getSellerBySlug = (slug: string) =>
  apiFetch<PublicSellerProfile>(`/marketplace/sellers/${slug}`, { mobile: false });

export const previewCheckout = (
  body: {
    items: Array<{ listingId: string; quantity: number }>;
    postalCode?: string;
    province?: string;
    shippingMethod?: 'delivery' | 'pickup';
  },
  token?: string
) =>
  apiFetch<CheckoutPreview>('/marketplace/checkout/preview', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
    mobile: false,
  });

export const createCheckout = (
  body: {
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
  },
  token?: string
) =>
  apiFetch<CheckoutResult>('/marketplace/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
    mobile: false,
  });

export const getChatByOrder = (orderNumber: string, token: string) =>
  apiFetch<ChatData>(`/marketplace/chat/order/${orderNumber}`, { token, mobile: false });

export const sendChatMessage = (conversationId: string, body: string, token: string) =>
  apiFetch<ChatMessage>(`/marketplace/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
    token,
    mobile: false,
  });

export interface SellerProfile {
  _id: string;
  businessName: string;
  slug: string;
  status: string;
  listingCount: number;
  totalSales: number;
  reputationScore: number;
  mercadoPagoConnected: boolean;
  rejectionReason?: string;
}

export interface PublicSellerProfile {
  _id: string;
  businessName: string;
  slug: string;
  description?: string;
  province?: string;
  city?: string;
  listingCount: number;
  totalSales: number;
  reputationScore: number;
}

export interface MarketplaceOrder {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  chatEnabled?: boolean;
  trackingCode?: string;
  createdAt?: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  shippingBySeller?: Array<{
    seller: string;
    sellerName?: string;
    status: string;
    trackingCode?: string;
  }>;
  items?: Array<{
    listing: string;
    title: string;
    quantity: number;
    subtotal: number;
  }>;
}

export const getSellerProfile = (token: string) =>
  apiFetch<SellerProfile>('/marketplace/seller/me', { token, mobile: false });

export const getSellerListings = (token: string) =>
  apiFetch<Listing[]>('/marketplace/seller/listings', { token, mobile: false });

export const getSellerOrders = (token: string) =>
  apiFetch<unknown[]>('/marketplace/seller/orders', { token, mobile: false });

export const getCategories = (all = true) =>
  apiFetch<Array<{ _id: string; name: string; slug: string }>>(
    `/marketplace/categories${all ? '?all=true' : ''}`,
    { mobile: false }
  );

export const createSellerListing = async (formData: FormData, token: string) => {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
  const res = await fetch(`${API_URL}/marketplace/seller/listings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-OrigenRed-Client': 'mobile',
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `Error ${res.status}`);
  }
  return data as Listing;
};

export const updateSellerListing = (
  id: string,
  body: Record<string, string | number | boolean>,
  token: string
) =>
  apiFetch<Listing>(`/marketplace/seller/listings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
    mobile: false,
  });

export const updateSellerListingFormData = async (id: string, formData: FormData, token: string) => {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
  const res = await fetch(`${API_URL}/marketplace/seller/listings/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-OrigenRed-Client': 'mobile',
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `Error ${res.status}`);
  }
  return data as Listing;
};

export const getMercadoPagoConnect = (token: string) =>
  apiFetch<{
    url: string | null;
    enabled: boolean;
    mercadoPagoConnected?: boolean;
    redirectUri?: string;
  }>('/marketplace/seller/mercadopago/connect', { token, mobile: true });

export const completeMercadoPagoConnect = (
  body: { code: string; state?: string },
  token: string
) =>
  apiFetch<{ mercadoPagoConnected: boolean }>('/marketplace/seller/mercadopago/callback', {
    method: 'POST',
    body: JSON.stringify({ ...body, returnClient: 'mobile' }),
    token,
    mobile: true,
  });

export const updateSellerOrder = (
  orderNumber: string,
  body: { status: 'shipped' | 'delivered'; trackingCode?: string },
  token: string
) =>
  apiFetch<unknown>(`/marketplace/seller/orders/${orderNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
    mobile: false,
  });

export interface FavoriteEntry {
  _id: string;
  listing: Listing;
}

export const getFavorites = (token: string) =>
  apiFetch<FavoriteEntry[]>('/marketplace/favorites', { token, mobile: false });

export const toggleFavorite = (listingId: string, token: string) =>
  apiFetch<{ favorited: boolean }>(`/marketplace/favorites/${listingId}`, {
    method: 'POST',
    token,
    mobile: false,
  });

export const REPORT_REASONS = [
  { value: 'producto_falso', label: 'Producto falso o engañoso' },
  { value: 'precio_incorrecto', label: 'Precio incorrecto' },
  { value: 'contenido_inapropiado', label: 'Contenido inapropiado' },
  { value: 'estafa', label: 'Posible estafa' },
  { value: 'otro', label: 'Otro' },
] as const;

export const createReport = (
  body: {
    listingId?: string;
    sellerId?: string;
    orderId?: string;
    reason: string;
    description?: string;
  },
  token: string
) =>
  apiFetch<{ message: string }>('/marketplace/reports', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
    mobile: false,
  });

export const getNotificationSummary = (token: string) =>
  apiFetch<{
    unreadChatMessages: number;
    totalUnread?: number;
    items?: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      href: string;
      at: string;
      unread?: boolean;
    }>;
  }>('/marketplace/notifications/summary', { token, mobile: true });

export const getMyConversations = (token: string) =>
  apiFetch<
    Array<{
      _id: string;
      unreadCount?: number;
      order?: { orderNumber: string; total: number; status: string };
      seller?: { businessName: string; slug: string };
      buyer?: { name: string; email: string };
    }>
  >('/marketplace/chat/conversations', { token, mobile: false });

export const cancelOrder = (orderNumber: string, token: string) =>
  apiFetch<{ orderNumber: string; status: string }>(
    `/marketplace/orders/${orderNumber}/cancel`,
    { method: 'POST', token, mobile: false }
  );

export const registerSeller = (body: {
  name: string;
  email: string;
  password: string;
  businessName: string;
  province?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  description?: string;
}) =>
  apiFetch<{ message: string }>('/marketplace/sellers/register', {
    method: 'POST',
    body: JSON.stringify(body),
    mobile: false,
  });
