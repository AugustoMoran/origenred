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

  const salesCount = Number(listing.salesCount) || 0;
  const views = Number(listing.views) || 0;

  // Ventas e interés (0-20 pts)
  score += Math.min(salesCount * 2, 15);
  score += Math.min(views / 100, 5);

  // Envío gratis (+5)
  if (listing.freeShipping) score += 5;

  // Descuento visible (+5)
  if (listing.compareAtPrice && listing.compareAtPrice > listing.price) {
    const discount = (listing.compareAtPrice - listing.price) / listing.compareAtPrice;
    score += Math.min(discount * 20, 5);
  }

  // Frescura — productos nuevos (+5 decay over 30 days)
  const createdMs = listing.createdAt ? new Date(listing.createdAt).getTime() : Date.now();
  const ageDays = Number.isFinite(createdMs)
    ? (Date.now() - createdMs) / (1000 * 60 * 60 * 24)
    : 0;
  score += Math.max(0, 5 - ageDays / 6);

  const finalScore = Math.round(Math.min(100, Math.max(0, score)));
  return Number.isFinite(finalScore) ? finalScore : 0;
};

export const sortByOrigenRank = { origenRankScore: -1 as const, createdAt: -1 as const };
