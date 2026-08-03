import { IListing } from '../models/Listing';
import { ISellerProfile } from '../models/SellerProfile';

/** OrigenRank™ — scoring simplificado inicial, extensible */
export const computeOrigenRankScore = (input: {
  listing: Pick<IListing, 'views' | 'salesCount' | 'freeShipping' | 'createdAt' | 'price' | 'compareAtPrice'>;
  seller?: Pick<ISellerProfile, 'reputationScore' | 'responseTimeHours' | 'mercadoPagoConnected'> | null;
}): number => {
  const { listing, seller } = input;
  let score = 50;

  // Reputación del vendedor (0-25 pts)
  if (seller) {
    score += (seller.reputationScore / 100) * 25;
    if (seller.mercadoPagoConnected) score += 5;
    if (seller.responseTimeHours != null && seller.responseTimeHours <= 24) score += 5;
  }

  // Ventas e interés (0-20 pts)
  score += Math.min(listing.salesCount * 2, 15);
  score += Math.min(listing.views / 100, 5);

  // Envío gratis (+5)
  if (listing.freeShipping) score += 5;

  // Descuento visible (+5)
  if (listing.compareAtPrice && listing.compareAtPrice > listing.price) {
    const discount = (listing.compareAtPrice - listing.price) / listing.compareAtPrice;
    score += Math.min(discount * 20, 5);
  }

  // Frescura — productos nuevos (+5 decay over 30 days)
  const ageDays = (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 5 - ageDays / 6);

  return Math.round(Math.min(100, Math.max(0, score)));
};

export const sortByOrigenRank = { origenRankScore: -1 as const, createdAt: -1 as const };
