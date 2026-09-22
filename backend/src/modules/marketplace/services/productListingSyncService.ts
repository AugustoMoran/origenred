import mongoose from 'mongoose';
import Product, { IProduct } from '../../inventory/models/Product';
import Supplier from '../../suppliers/models/Supplier';
import { User } from '../../auth/models/User';
import { MarketplaceCategory } from '../models/MarketplaceCategory';
import { Listing } from '../models/Listing';
import { SellerProfile } from '../models/SellerProfile';
import { computeOrigenRankScore } from './origenRankService';
import { indexListing, removeListingFromIndex } from './meilisearchService';
import { listingImagesFromProductOrExisting } from '../../inventory/services/productMediaRepairService';

const OFFICIAL_SELLER_SLUG = 'origenred-oficial';

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function resolveMarketplaceCategory(productCategory: string) {
  const key = String(productCategory || '').trim().toLowerCase();
  if (!key) {
    return MarketplaceCategory.findOne({ slug: 'otros', isActive: true });
  }

  const slugKey = slugify(key);
  const bySlug = await MarketplaceCategory.findOne({ slug: slugKey, isActive: true });
  if (bySlug) return bySlug;

  const byName = await MarketplaceCategory.findOne({
    name: new RegExp(`^${escapeRegex(key)}$`, 'i'),
    isActive: true,
  });
  if (byName) return byName;

  const partial = await MarketplaceCategory.findOne({
    slug: new RegExp(escapeRegex(slugKey), 'i'),
    isActive: true,
  });
  if (partial) return partial;

  return MarketplaceCategory.findOne({ slug: 'otros', isActive: true });
}

export async function ensureOfficialSellerProfile(adminUserId: mongoose.Types.ObjectId) {
  let seller = await SellerProfile.findOne({ slug: OFFICIAL_SELLER_SLUG });
  if (seller) {
    if (seller.mercadoPagoConnected && !seller.mercadoPagoUserId) {
      seller.mercadoPagoConnected = false;
      await seller.save();
    }
    return seller;
  }

  const admin = await User.findById(adminUserId);
  if (!admin) throw new Error('Admin no encontrado para tienda oficial');

  seller = await SellerProfile.create({
    user: adminUserId,
    businessName: 'OrigenRed Oficial',
    slug: OFFICIAL_SELLER_SLUG,
    description: 'Productos oficiales de OrigenRed — inventario y marketplace.',
    status: 'approved',
    province: 'Buenos Aires',
    city: 'CABA',
    postalCode: '1425',
    reputationScore: 95,
    mercadoPagoConnected: false,
    approvedAt: new Date(),
    approvedBy: adminUserId,
    listingCount: 0,
  });

  if (!admin.roles.includes('vendedor_marketplace')) {
    admin.roles = [...admin.roles, 'vendedor_marketplace'];
    await admin.save();
  }

  return seller;
}

/**
 * Inventario del panel admin: si el admin tiene perfil de vendedor aprobado, publica ahí
 * (misma cuenta que Mercado Pago). Si no, usa la tienda OrigenRed Oficial.
 */
export async function resolveSellerForInventorySync(
  actingUserId: mongoose.Types.ObjectId
) {
  const user = await User.findById(actingUserId);
  if (user?.roles?.includes('admin')) {
    const ownApproved = await SellerProfile.findOne({
      user: actingUserId,
      status: 'approved',
    }).sort({ updatedAt: -1 });
    if (ownApproved) return ownApproved;
  }
  return ensureOfficialSellerProfile(actingUserId);
}

async function refreshSellerListingCount(sellerId: mongoose.Types.ObjectId | string) {
  const count = await Listing.countDocuments({ seller: sellerId, status: 'active' });
  await SellerProfile.findByIdAndUpdate(sellerId, { listingCount: count });
}

async function getDefaultAdminId(): Promise<mongoose.Types.ObjectId> {
  const admin = await User.findOne({ roles: { $in: ['admin'] } }).sort({ createdAt: 1 });
  if (!admin) throw new Error('No hay usuario admin para publicar en marketplace');
  return admin._id as mongoose.Types.ObjectId;
}

async function uniqueListingSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || `producto-${Date.now()}`;
  let counter = 1;
  while (true) {
    const exists = await Listing.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!exists) return slug;
    slug = `${slugify(base)}-${counter++}`;
  }
}

export async function unpublishProductListing(productId: string) {
  const listing = await Listing.findOne({ inventoryProductId: productId });
  if (!listing) return;

  const wasActive = listing.status === 'active';
  listing.status = 'paused';
  await listing.save();

  if (wasActive) {
    await removeListingFromIndex(String(listing._id));
    await SellerProfile.findByIdAndUpdate(listing.seller, { $inc: { listingCount: -1 } });
  }
}

export async function syncProductToMarketplaceListing(
  productId: string,
  adminUserId?: mongoose.Types.ObjectId
) {
  const product = await Product.findById(productId);
  if (!product) return null;

  const existingListing = await Listing.findOne({ inventoryProductId: product._id }).select('images');

  if (!product.isActive) {
    await unpublishProductListing(productId);
    return null;
  }

  if (product.paused) {
    await unpublishProductListing(productId);
    return null;
  }

  const adminId = adminUserId || (await getDefaultAdminId());
  const seller = await resolveSellerForInventorySync(adminId);
  const category = await resolveMarketplaceCategory(product.category);
  if (!category) {
    console.warn(`[sync] Sin categoría marketplace para producto ${product.sku}`);
    return null;
  }

  const description =
    product.longDescription ||
    product.commercialDescription ||
    product.description ||
    product.name;

  let supplierName: string | undefined;
  if (product.supplier) {
    const sup = await Supplier.findById(product.supplier).select('name');
    supplierName = sup?.name;
  }
  const supplierProductCode = product.supplierProductCode?.trim() || undefined;

  const listingPayload = {
    seller: seller._id,
    inventoryProductId: product._id,
    title: product.name,
    description,
    shortDescription: (product.commercialDescription || product.description || product.name).slice(0, 120),
    price: product.price,
    currency: 'ARS',
    stock: product.stock,
    category: category._id,
    brand: product.internalCode || product.sku,
    condition: 'new' as const,
    images: listingImagesFromProductOrExisting(product, existingListing),
    weight: product.weight,
    dimensions: product.dimensions,
    freeShipping: false,
    allowPickup: true,
    province: seller.province,
    city: seller.city,
    postalCode: seller.postalCode,
    status: 'active' as const,
    moderated: false,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    supplierName,
    supplierProductCode,
  };

  let listing = existingListing || (await Listing.findOne({ inventoryProductId: product._id }));
  const wasActive = listing?.status === 'active';
  const previousSellerId = listing?.seller ? String(listing.seller) : null;

  if (listing) {
    const slug = product.slug
      ? await uniqueListingSlug(product.slug, String(listing._id))
      : listing.slug;
    Object.assign(listing, listingPayload, { slug });
    listing.origenRankScore = computeOrigenRankScore({ listing, seller });
    await listing.save();
  } else {
    const slug = await uniqueListingSlug(product.slug || product.name);
    listing = await Listing.create({
      ...listingPayload,
      slug,
      origenRankScore: 0,
      views: 0,
      salesCount: 0,
    });
    listing.origenRankScore = computeOrigenRankScore({ listing, seller });
    await listing.save();
  }

  if (previousSellerId && previousSellerId !== String(seller._id)) {
    await refreshSellerListingCount(previousSellerId);
  }

  if (listing.status === 'active') {
    await indexListing(listing);
    await refreshSellerListingCount(seller._id);
  }

  const activeCount = await Listing.countDocuments({
    category: category._id,
    status: 'active',
    moderated: { $ne: true },
  });
  await MarketplaceCategory.findByIdAndUpdate(category._id, { listingCount: activeCount });

  return listing;
}

export async function syncAllInventoryProductsToMarketplace(adminUserId?: mongoose.Types.ObjectId) {
  const adminId = adminUserId || (await getDefaultAdminId());
  const products = await Product.find({ isActive: true, paused: { $ne: true } });
  let synced = 0;
  for (const product of products) {
    await syncProductToMarketplaceListing(String(product._id), adminId);
    synced += 1;
  }
  return synced;
}
