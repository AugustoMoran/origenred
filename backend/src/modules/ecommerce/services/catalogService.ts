import Product from '../../inventory/models/Product';

export const CATALOG_PUBLIC_FILTER = {
  isActive: true,
  paused: { $ne: true },
};

const CATALOG_SELECT = [
  'name', 'slug', 'sku', 'description', 'commercialDescription', 'longDescription',
  'price', 'iva', 'category', 'imageUrl', 'gallery', 'featured', 'weight',
  'dimensions', 'seoTitle', 'seoDescription', 'displayOrder', 'stock',
].join(' ');

export const getCatalogProducts = async (query: any = {}) => {
  const filters: any = { ...CATALOG_PUBLIC_FILTER };

  if (query.category) {
    filters.category = String(query.category).trim();
  }

  if (query.featured === 'true') {
    filters.featured = true;
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filters.$or = [
        { name: regex },
        { commercialDescription: regex },
        { slug: regex },
      ];
    }
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
  const skip = (page - 1) * limit;

  const sort: any = { displayOrder: 1, name: 1 };
  if (query.sort === 'price_asc') sort.price = 1;
  if (query.sort === 'price_desc') sort.price = -1;
  if (query.sort === 'newest') sort.createdAt = -1;

  const [items, total] = await Promise.all([
    Product.find(filters).select(CATALOG_SELECT).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filters),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getCatalogProductBySlug = async (slug: string) => {
  return await Product.findOne({ ...CATALOG_PUBLIC_FILTER, slug: String(slug).trim().toLowerCase() })
    .select(CATALOG_SELECT);
};

export const getCatalogCategories = async () => {
  return await Product.distinct('category', CATALOG_PUBLIC_FILTER);
};

export const getFeaturedProducts = async (limit = 8) => {
  return await Product.find({ ...CATALOG_PUBLIC_FILTER, featured: true })
    .select(CATALOG_SELECT)
    .sort({ displayOrder: 1, name: 1 })
    .limit(limit);
};
