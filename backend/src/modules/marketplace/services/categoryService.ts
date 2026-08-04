import { MarketplaceCategory } from '../models/MarketplaceCategory';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const uniqueSlug = async (base: string, excludeId?: string) => {
  let slug = base || `cat-${Date.now()}`;
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

  const baseSlug = slugify(name);
  const slug = await uniqueSlug(baseSlug);

  return MarketplaceCategory.create({
    name,
    slug,
    description: input.description,
    icon: input.icon,
    displayOrder: input.displayOrder ?? 0,
    isActive: input.isActive ?? true,
  });
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

  if (data.name && data.name.trim() !== category.name) {
    category.name = data.name.trim();
    const baseSlug = slugify(category.name);
    category.slug = await uniqueSlug(baseSlug, String(category._id));
  }
  if (data.description !== undefined) category.description = data.description;
  if (data.icon !== undefined) category.icon = data.icon;
  if (data.displayOrder !== undefined) category.displayOrder = data.displayOrder;
  if (data.isActive !== undefined) category.isActive = data.isActive;

  await category.save();
  return category;
};

export const deleteMarketplaceCategory = async (id: string) => {
  const category = await MarketplaceCategory.findById(id);
  if (!category) throw new Error('Categoría no encontrada');
  if (category.listingCount > 0) {
    throw new Error('No se puede eliminar: hay publicaciones en esta categoría');
  }
  await category.deleteOne();
  return { deleted: true };
};
