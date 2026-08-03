/** Roles internos (panel admin / POS propio) */
export const INTERNAL_ROLES = {
  ADMIN: 'admin',
  STAFF: 'vendedor',
} as const;

/** Roles marketplace OrigenRed */
export const MARKETPLACE_ROLES = {
  BUYER: 'comprador',
  SELLER: 'vendedor_marketplace',
} as const;

export const ALL_ROLES = {
  ...INTERNAL_ROLES,
  ...MARKETPLACE_ROLES,
} as const;

export type InternalRole = (typeof INTERNAL_ROLES)[keyof typeof INTERNAL_ROLES];
export type MarketplaceRole = (typeof MARKETPLACE_ROLES)[keyof typeof MARKETPLACE_ROLES];

export const SELLER_STATUSES = ['pending', 'approved', 'suspended', 'rejected'] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

export const LISTING_STATUSES = ['draft', 'active', 'paused', 'sold_out', 'moderated'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
