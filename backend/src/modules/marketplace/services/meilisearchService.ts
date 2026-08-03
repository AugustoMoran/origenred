import { features, meilisearchConfig } from '../../../config/features';
import { IListing } from '../models/Listing';

const LISTINGS_INDEX = 'listings';

// Meilisearch client — lazy loaded to avoid module resolution issues
type MeiliClient = {
  index: (name: string) => {
    addDocuments: (docs: unknown[]) => Promise<unknown>;
    deleteDocument: (id: string) => Promise<unknown>;
    search: (q: string, opts?: Record<string, unknown>) => Promise<{ hits: Array<{ id: string }>; estimatedTotalHits?: number }>;
    updateFilterableAttributes: (attrs: string[]) => Promise<unknown>;
    updateSortableAttributes: (attrs: string[]) => Promise<unknown>;
  };
  createIndex: (name: string, opts: { primaryKey: string }) => Promise<unknown>;
};

const loadMeili = (): MeiliClient | null => {
  if (!features.meilisearch) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MeiliSearch } = require('meilisearch');
    return new MeiliSearch({
      host: meilisearchConfig.host,
      apiKey: meilisearchConfig.apiKey,
    }) as MeiliClient;
  } catch {
    return null;
  }
};

let client: MeiliClient | null = null;

const getClient = () => {
  if (!features.meilisearch) return null;
  if (!client) client = loadMeili();
  return client;
};

export const isMeilisearchEnabled = () => features.meilisearch;

export const ensureListingsIndex = async () => {
  const meili = getClient();
  if (!meili) return;

  try {
    await meili.createIndex(LISTINGS_INDEX, { primaryKey: 'id' });
  } catch {
    // index may already exist
  }

  const index = meili.index(LISTINGS_INDEX);
  await index.updateFilterableAttributes([
    'category',
    'brand',
    'color',
    'province',
    'city',
    'status',
    'freeShipping',
    'condition',
  ]);
  await index.updateSortableAttributes([
    'price',
    'origenRankScore',
    'createdAt',
    'salesCount',
  ]);
};

export const indexListing = async (listing: IListing) => {
  const meili = getClient();
  if (!meili || listing.status !== 'active') return;

  const index = meili.index(LISTINGS_INDEX);
  await index.addDocuments([
    {
      id: String(listing._id),
      title: listing.title,
      description: listing.description,
      brand: listing.brand,
      color: listing.color,
      size: listing.size,
      price: listing.price,
      category: String(listing.category),
      province: listing.province,
      city: listing.city,
      status: listing.status,
      freeShipping: listing.freeShipping,
      condition: listing.condition,
      origenRankScore: listing.origenRankScore,
      salesCount: listing.salesCount,
      createdAt: listing.createdAt?.getTime?.() || Date.now(),
      slug: listing.slug,
      imageUrl: listing.images?.[0]?.url,
    },
  ]);
};

export const removeListingFromIndex = async (listingId: string) => {
  const meili = getClient();
  if (!meili) return;
  await meili.index(LISTINGS_INDEX).deleteDocument(listingId);
};

export const searchListings = async (query: string, options: Record<string, unknown> = {}) => {
  const meili = getClient();
  if (!meili) return null;

  const index = meili.index(LISTINGS_INDEX);
  return index.search(query, {
    filter: 'status = active',
    ...options,
  });
};
