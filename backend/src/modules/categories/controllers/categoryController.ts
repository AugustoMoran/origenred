import { Request, Response } from 'express';
import Category from '../models/Category';
import { MarketplaceCategory } from '../../marketplace/models/MarketplaceCategory';
import { createMarketplaceCategory, deleteMarketplaceCategory } from '../../marketplace/services/categoryService';
import { updateMarketplaceCategory } from '../../marketplace/services/categoryService';
import {
  deactivateSyncedCategories,
  listActiveCategoriesUnified,
  resolveMarketplaceCategoryId,
  syncPosCategoryFromMarketplace,
} from '../services/categorySyncService';

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await listActiveCategoriesUnified();
    res.json(
      categories.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        isActive: c.isActive,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'El nombre de categoría es obligatorio' });

    const exists = await MarketplaceCategory.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (exists?.isActive) {
      return res.status(409).json({ message: 'La categoría ya existe' });
    }

    const category = exists
      ? await MarketplaceCategory.findByIdAndUpdate(
          exists._id,
          { name, isActive: true, icon: req.body?.icon ?? exists.icon },
          { new: true }
        )
      : await createMarketplaceCategory({ name, icon: req.body?.icon, isActive: true });

    if (!category) return res.status(400).json({ message: 'No se pudo crear la categoría' });

    await syncPosCategoryFromMarketplace(category.name);

    res.status(201).json({ _id: category._id, name: category.name, icon: category.icon });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'La categoría ya existe' });
    }
    res.status(400).json({ message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'El nombre de categoría es obligatorio' });

    const resolved = await resolveMarketplaceCategoryId(id);
    if (!resolved) return res.status(404).json({ message: 'Categoría no encontrada' });

    const category = await updateMarketplaceCategory(String(resolved._id), {
      name,
      icon: req.body?.icon,
    });
    res.json({ _id: category._id, name: category.name, icon: category.icon });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let category = await MarketplaceCategory.findById(id);
    if (!category) {
      const pos = await Category.findById(id);
      if (!pos) return res.status(404).json({ message: 'Categoría no encontrada' });
      category = await MarketplaceCategory.findOne({
        name: new RegExp(`^${pos.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });
      if (!category) {
        await Category.findByIdAndUpdate(id, { isActive: false });
        return res.json({ message: 'Categoría desactivada' });
      }
    }

    if (category.listingCount > 0) {
      await deactivateSyncedCategories(category.name);
      return res.json({ message: 'Categoría desactivada (tiene publicaciones en el marketplace)' });
    }

    await deleteMarketplaceCategory(String(category._id));
    await deactivateSyncedCategories(category.name);
    res.json({ message: 'Categoría eliminada' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
