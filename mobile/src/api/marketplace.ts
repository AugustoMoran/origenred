import { apiFetch } from './client';

export interface Listing {
  _id: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
  stock: number;
  freeShipping: boolean;
  origenRankScore: number;
  salesCount: number;
  images: Array<{ url: string }>;
  seller?: { businessName: string; slug: string };
}

export interface HomeData {
  featured: Listing[];
  newest: Listing[];
  bestsellers: Listing[];
  categories: Array<{ _id: string; name: string; slug: string; icon?: string; listingCount: number }>;
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
  apiFetch<unknown[]>('/marketplace/orders', { token, mobile: false });
