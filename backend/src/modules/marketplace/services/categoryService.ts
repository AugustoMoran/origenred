import { MarketplaceCategory } from '../models/MarketplaceCategory';
import {
  deactivateSyncedCategories,
  renameSyncedCategories,
  syncPosCategoryFromMarketplace,
} from '../../categories/services/categorySyncService';
import { buildUniqueCategorySlug } from '../utils/categorySlug';

export const listAdminCategories = () =>
  MarketplaceCategory.find().sort({ displayOrder: 1, name: 1 });

export const createMarketplaceCategory = async (input: {
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
}) => {
  const name = input.name?.trim();
  if (!name) throw new Error('Nombre requerido');

  const slug = await buildUniqueCategorySlug(name);

  const created = await MarketplaceCategory.create({
    name,
    slug,
    description: input.description,
    icon: input.icon,
    displayOrder: input.displayOrder ?? 0,
    isActive: input.isActive ?? true,
  });
  await syncPosCategoryFromMarketplace(created.name);
  return created;
};

export const updateMarketplaceCategory = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
  }>
) => {
  const category = await MarketplaceCategory.findById(id);
  if (!category) throw new Error('Categoría no encontrada');

  const previousName = category.name;

  if (data.name && data.name.trim() !== category.name) {
    category.name = data.name.trim();
    category.slug = await buildUniqueCategorySlug(category.name, String(category._id));
  }
  if (data.description !== undefined) category.description = data.description;
  if (data.icon !== undefined) category.icon = data.icon;
  if (data.displayOrder !== undefined) category.displayOrder = data.displayOrder;
  if (data.isActive !== undefined) category.isActive = data.isActive;

  await category.save();

  if (data.name && data.name.trim() !== previousName) {
    await renameSyncedCategories(previousName, category.name);
  }
  if (data.isActive === false) {
    await deactivateSyncedCategories(category.name);
  } else if (category.isActive) {
    await syncPosCategoryFromMarketplace(category.name);
  }

  return category;
};

export const deleteMarketplaceCategory = async (id: string) => {
  const category = await MarketplaceCategory.findById(id);
  if (!category) throw new Error('Categoría no encontrada');
  if (category.listingCount > 0) {
    throw new Error('No se puede eliminar: hay publicaciones en esta categoría');
  }
  const name = category.name;
  await category.deleteOne();
  await deactivateSyncedCategories(name);
  return { deleted: true };
};
