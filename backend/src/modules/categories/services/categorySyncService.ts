import Category from '../models/Category';
import Product from '../../inventory/models/Product';
import { MarketplaceCategory } from '../../marketplace/models/MarketplaceCategory';
import { buildUniqueCategorySlug } from '../../marketplace/utils/categorySlug';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const nameRegex = (name: string) => new RegExp(`^${escapeRegex(name.trim())}$`, 'i');

export const syncPosCategoryFromMarketplace = async (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return;

  const existing = await Category.findOne({ name: nameRegex(trimmed) });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.name = trimmed;
      await existing.save();
    }
    return existing;
  }

  return Category.create({ name: trimmed, isActive: true });
};

export const syncMarketplaceCategoryFromPos = async (name: string, icon?: string) => {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const existing = await MarketplaceCategory.findOne({ name: nameRegex(trimmed) });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }
    return existing;
  }

  const slug = await buildUniqueCategorySlug(trimmed);
  const created = await MarketplaceCategory.create({
    name: trimmed,
    slug,
    icon,
    displayOrder: 0,
    isActive: true,
  });
  await syncPosCategoryFromMarketplace(created.name);
  return created;
};

/** Alinea categorías POS ↔ marketplace por nombre (idempotente). */
export const syncCategoriesBidirectional = async () => {
  const posCats = await Category.find({ isActive: true });
  for (const pos of posCats) {
    await syncMarketplaceCategoryFromPos(pos.name);
  }

  const marketplaceCats = await MarketplaceCategory.find({ isActive: true });
  for (const mp of marketplaceCats) {
    await syncPosCategoryFromMarketplace(mp.name);
  }
};

export const listActiveCategoriesUnified = async () => {
  await syncCategoriesBidirectional();
  return MarketplaceCategory.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
};

export const renameSyncedCategories = async (oldName: string, newName: string) => {
  const from = oldName.trim();
  const to = newName.trim();
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) return;

  await Product.updateMany({ category: nameRegex(from) }, { $set: { category: to } });

  const pos = await Category.findOne({ name: nameRegex(from) });
  if (pos) {
    pos.name = to;
    pos.isActive = true;
    await pos.save();
  }
};

export const deactivateSyncedCategories = async (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return;

  await Category.updateMany({ name: nameRegex(trimmed) }, { $set: { isActive: false } });
  await MarketplaceCategory.updateMany({ name: nameRegex(trimmed) }, { $set: { isActive: false } });
};

export const resolveMarketplaceCategoryId = async (id: string) => {
  const byMarketplace = await MarketplaceCategory.findById(id);
  if (byMarketplace) return byMarketplace;

  const byPos = await Category.findById(id);
  if (!byPos) return null;

  return syncMarketplaceCategoryFromPos(byPos.name);
};
