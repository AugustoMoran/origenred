import type { PickupShipFrom } from '../components/marketplace/PickupLocationCard';

export type OrderShippingBySellerRow = {
  seller?: string;
  sellerName?: string;
  shipFromStreet?: string;
  shipFromCity?: string;
  shipFromProvince?: string;
  shipFromPostalCode?: string;
  shipFromLabel?: string;
  shipFromSource?: 'platform' | 'seller';
};

export const shipFromFromOrderRow = (row: OrderShippingBySellerRow): PickupShipFrom => ({
  street: row.shipFromStreet,
  city: row.shipFromCity,
  province: row.shipFromProvince,
  postalCode: row.shipFromPostalCode,
  label: row.shipFromLabel,
  source: row.shipFromSource,
});
