import { Listing, IListing } from '../models/Listing';
import { SellerProfile } from '../models/SellerProfile';
import { MarketplaceCategory } from '../models/MarketplaceCategory';
import { marketplaceConfig } from '../../../config/features';
import { computeOrigenRankScore, sortByOrigenRank } from './origenRankService';
import { indexListing, removeListingFromIndex, searchListings } from './meilisearchService';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const uniqueSlug = async (base: string, excludeId?: string) => {
  let slug = base;
  let counter = 1;
  while (true) {
    const exists = await Listing.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!exists) return slug;
    slug = `${base}-${counter++}`;
  }
};

export const PUBLIC_LISTING_FILTER = { status: 'active', moderated: { $ne: true } };

export const getSellerListingCount = (sellerId: string) =>
  Listing.countDocuments({ seller: sellerId, status: { $in: ['active', 'draft', 'paused'] } });

export const createListing = async (sellerProfileId: string, data: Partial<IListing>) => {
  const seller = await SellerProfile.findById(sellerProfileId);
  if (!seller || seller.status !== 'approved') {
    throw new Error('Vendedor no aprobado');
  }

  const count = await getSellerListingCount(sellerProfileId);
  if (count >= marketplaceConfig.maxListingsPerSeller) {
    throw new Error(`Límite de ${marketplaceConfig.maxListingsPerSeller} publicaciones alcanzado`);
  }

  const category = await MarketplaceCategory.findOne({ _id: data.category, isActive: true });
  if (!category) throw new Error('Categoría inválida');

  const baseSlug = slugify(String(data.title));
  const slug = await uniqueSlug(baseSlug || `producto-${Date.now()}`);

  const listing = await Listing.create({
    ...data,
    seller: sellerProfileId,
    slug,
    province: data.province || seller.province,
    city: data.city || seller.city,
    postalCode: data.postalCode || seller.postalCode,
    origenRankScore: 0,
  });

  listing.origenRankScore = computeOrigenRankScore({ listing, seller });
  await listing.save();

  if (listing.status === 'active') {
    await indexListing(listing);
    await MarketplaceCategory.findByIdAndUpdate(category._id, { $inc: { listingCount: 1 } });
    await SellerProfile.findByIdAndUpdate(sellerProfileId, { $inc: { listingCount: 1 } });
  }

  return listing;
};

export const updateListing = async (
  listingId: string,
  sellerProfileId: string,
  data: Partial<IListing>
) => {
  const listing = await Listing.findOne({ _id: listingId, seller: sellerProfileId });
  if (!listing) throw new Error('Publicación no encontrada');

  const wasActive = listing.status === 'active';

  if (data.title && data.title !== listing.title) {
    listing.slug = await uniqueSlug(slugify(data.title), String(listing._id));
  }

  Object.assign(listing, data);
  const seller = await SellerProfile.findById(sellerProfileId);
  listing.origenRankScore = computeOrigenRankScore({ listing, seller });

  await listing.save();

  if (listing.status === 'active') {
    await indexListing(listing);
  } else if (wasActive) {
    await removeListingFromIndex(String(listing._id));
  }

  return listing;
};

export const getPublicListings = async (query: Record<string, unknown> = {}) => {
  const filters: Record<string, unknown> = { ...PUBLIC_LISTING_FILTER };

  if (query.category) filters.category = query.category;
  if (query.seller) filters.seller = query.seller;
  if (query.brand) filters.brand = String(query.brand);
  if (query.province) filters.province = String(query.province);
  if (query.freeShipping === 'true') filters.freeShipping = true;

  if (query.minPrice || query.maxPrice) {
    filters.price = {};
    if (query.minPrice) (filters.price as any).$gte = Number(query.minPrice);
    if (query.maxPrice) (filters.price as any).$lte = Number(query.maxPrice);
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(query.limit) || 24));
  const skip = (page - 1) * limit;

  let sort: Record<string, 1 | -1> = sortByOrigenRank as any;
  if (query.sort === 'price_asc') sort = { price: 1 };
  if (query.sort === 'price_desc') sort = { price: -1 };
  if (query.sort === 'newest') sort = { createdAt: -1 };
  if (query.sort === 'bestseller') sort = { salesCount: -1 };

  // Búsqueda semántica vía Meilisearch si hay query.search
  if (query.search && typeof query.search === 'string') {
    const meiliResult = await searchListings(String(query.search), {
      limit,
      offset: skip,
    });
    if (meiliResult?.hits?.length) {
      const ids = meiliResult.hits.map((h: any) => h.id);
      const items = await Listing.find({ _id: { $in: ids }, ...PUBLIC_LISTING_FILTER })
        .populate('seller', 'businessName slug reputationScore')
        .populate('category', 'name slug');
      const orderMap = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
      items.sort((a, b) => {
        const ai = orderMap.get(String(a._id)) ?? 0;
        const bi = orderMap.get(String(b._id)) ?? 0;
        return ai - bi;
      });
      return {
        items,
        pagination: {
          page,
          limit,
          total: meiliResult.estimatedTotalHits || items.length,
          pages: Math.ceil((meiliResult.estimatedTotalHits || items.length) / limit) || 1,
        },
        source: 'meilisearch',
      };
    }
  }

  if (query.search) {
    const search = String(query.search).trim();
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filters.$or = [{ title: regex }, { description: regex }, { brand: regex }];
  }

  const [items, total] = await Promise.all([
    Listing.find(filters)
      .populate('seller', 'businessName slug reputationScore')
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Listing.countDocuments(filters),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    source: 'mongodb',
  };
};

export const getPublicListingBySlug = async (slug: string) => {
  const listing = await Listing.findOne({ ...PUBLIC_LISTING_FILTER, slug })
    .populate('seller', 'businessName slug reputationScore totalSales mercadoPagoConnected province city')
    .populate('category', 'name slug');

  if (listing) {
    await Listing.findByIdAndUpdate(listing._id, { $inc: { views: 1 } });
  }

  return listing;
};

export const getSellerListings = (sellerProfileId: string) =>
  Listing.find({ seller: sellerProfileId })
    .populate('category', 'name slug')
    .sort({ updatedAt: -1 });

export const getAdminListings = async (query: Record<string, unknown> = {}) => {
  const filters: Record<string, unknown> = {};

  if (query.status) filters.status = String(query.status);
  if (query.seller) filters.seller = query.seller;
  if (query.search) {
    const search = String(query.search).trim();
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filters.$or = [{ title: regex }, { description: regex }, { brand: regex }];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Listing.find(filters)
      .populate('seller', 'businessName slug status')
      .populate('category', 'name slug')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Listing.countDocuments(filters),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const deleteListing = async (listingId: string, sellerProfileId: string) => {
  const listing = await Listing.findOne({ _id: listingId, seller: sellerProfileId });
  if (!listing) throw new Error('Publicación no encontrada');

  const wasActive = listing.status === 'active';
  await listing.deleteOne();

  if (wasActive) {
    await removeListingFromIndex(String(listingId));
    await MarketplaceCategory.findByIdAndUpdate(listing.category, { $inc: { listingCount: -1 } });
    await SellerProfile.findByIdAndUpdate(sellerProfileId, { $inc: { listingCount: -1 } });
  }

  return { deleted: true };
};
