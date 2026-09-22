import Product from '../models/Product';
import { Listing } from '../../marketplace/models/Listing';
import {
  extractStorageKeyFromUrl,
  isCloudinaryMediaUrl,
  isPlaceholderMediaUrl,
  isR2ObjectKey,
  normalizeProductMedia,
  repairProductMediaInPlace,
  resolveStoredMediaUrl,
} from '../../../shared/utils/mediaUrl';
import { Request } from 'express';

const hasUsableMedia = (url?: string | null, key?: string | null) => {
  const resolved = resolveStoredMediaUrl(url, key);
  if (resolved && !isPlaceholderMediaUrl(resolved)) return true;
  if (isCloudinaryMediaUrl(url)) return true;
  const inferred = extractStorageKeyFromUrl(url);
  if (isR2ObjectKey(inferred)) return true;
  return Boolean(url?.trim() && !isPlaceholderMediaUrl(url));
};

export const prepareProductForClient = (
  product: Record<string, unknown>,
  listing?: { images?: Array<{ url?: string; key?: string; alt?: string }> } | null,
  req?: Request
) => {
  repairProductMediaFromListing(product as any, listing);
  repairProductMediaInPlace(product as any);
  return normalizeProductMedia(product as any, req);
};

export async function persistProductMediaIfRepaired(
  productId: string,
  before: { imageUrl?: string; imagePublicId?: string },
  after: { imageUrl?: string; imagePublicId?: string }
) {
  if (before.imageUrl === after.imageUrl && before.imagePublicId === after.imagePublicId) return;
  if (!after.imageUrl || isPlaceholderMediaUrl(after.imageUrl)) return;
  const $set: Record<string, unknown> = { imageUrl: after.imageUrl };
  if (after.imagePublicId) $set.imagePublicId = after.imagePublicId;
  if (Array.isArray((after as any).gallery) && (after as any).gallery.length) {
    $set.gallery = (after as any).gallery;
  }
  await Product.updateOne({ _id: productId }, { $set });
}

export const repairProductMediaFromListing = (
  product: {
    imageUrl?: string;
    imagePublicId?: string;
    gallery?: Array<{ url?: string; publicId?: string; alt?: string }>;
  },
  listing?: { images?: Array<{ url?: string; key?: string; alt?: string }> } | null
) => {
  if (!listing?.images?.length) return false;

  const productOk = hasUsableMedia(product.imageUrl, product.imagePublicId);
  if (productOk) return false;

  const listingImages = listing.images
    .map((img) => {
      const inferredKey = img.key || extractStorageKeyFromUrl(img.url);
      const url = resolveStoredMediaUrl(img.url, inferredKey) || img.url?.trim();
      if (!url || isPlaceholderMediaUrl(url)) return null;
      return {
        url,
        publicId: isR2ObjectKey(inferredKey) ? inferredKey : undefined,
        alt: img.alt,
      };
    })
    .filter(Boolean) as Array<{ url: string; publicId?: string; alt?: string }>;

  if (!listingImages.length) return false;

  product.imageUrl = listingImages[0].url;
  product.imagePublicId = listingImages[0].publicId;
  product.gallery = listingImages.map((img) => ({
    url: img.url,
    publicId: img.publicId,
    alt: img.alt || '',
  }));

  return true;
};

export const listingImagesFromProductOrExisting = (
  product: {
    imageUrl?: string;
    imagePublicId?: string;
    gallery?: Array<{ url?: string; publicId?: string; alt?: string }>;
    name?: string;
  },
  existingListing?: { images?: Array<{ url?: string; key?: string; alt?: string }> } | null
) => {
  const fromProduct = (product.gallery || [])
    .map((item) => {
      const url = resolveStoredMediaUrl(item.url, item.publicId);
      if (!url || isPlaceholderMediaUrl(url)) return null;
      return {
        url,
        key: isR2ObjectKey(item.publicId) ? item.publicId : undefined,
        alt: item.alt || product.name || '',
      };
    })
    .filter(Boolean) as Array<{ url: string; key?: string; alt: string }>;

  if (fromProduct.length) return fromProduct;

  const mainUrl = resolveStoredMediaUrl(product.imageUrl, product.imagePublicId);
  if (mainUrl && !isPlaceholderMediaUrl(mainUrl)) {
    return [
      {
        url: mainUrl,
        key: isR2ObjectKey(product.imagePublicId) ? product.imagePublicId : undefined,
        alt: product.name || '',
      },
    ];
  }

  if (!existingListing?.images?.length) return [];

  return existingListing.images
    .map((img) => {
      const url = resolveStoredMediaUrl(img.url, img.key) || img.url?.trim();
      if (!url || isPlaceholderMediaUrl(url)) return null;
      return {
        url,
        key: isR2ObjectKey(img.key) ? img.key : undefined,
        alt: img.alt || product.name || '',
      };
    })
    .filter(Boolean) as Array<{ url: string; key?: string; alt: string }>;
};

export const repairAllInventoryProductMedia = async () => {
  const products = await Product.find({ isActive: true });
  let repairedProducts = 0;
  let repairedFromListing = 0;
  let stillMissing = 0;

  for (const product of products) {
    const listing = await Listing.findOne({ inventoryProductId: product._id }).select('images');

    const fromListing = repairProductMediaFromListing(product, listing);
    const normalized = repairProductMediaInPlace(product);

    if (fromListing || normalized) {
      await product.save();
      repairedProducts += 1;
      if (fromListing) repairedFromListing += 1;
    } else if (!hasUsableMedia(product.imageUrl, product.imagePublicId)) {
      stillMissing += 1;
    }
  }

  return {
    scanned: products.length,
    repairedProducts,
    repairedFromListing,
    stillMissing,
  };
};
