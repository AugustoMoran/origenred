import { MarketplaceCategory } from '../models/MarketplaceCategory';

export const slugifyCategoryName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const buildUniqueCategorySlug = async (name: string, excludeId?: string) => {
  const base = slugifyCategoryName(name) || `cat-${Date.now()}`;
  let slug = base;
  let counter = 1;
  while (true) {
    const exists = await MarketplaceCategory.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!exists) return slug;
    slug = `${base}-${counter++}`;
  }
};
