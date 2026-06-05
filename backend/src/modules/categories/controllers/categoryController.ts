import { Request, Response } from 'express';
import Category from '../models/Category';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'El nombre de categoría es obligatorio' });

    const exists = await Category.findOne({
      isActive: true,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (exists) {
      return res.status(409).json({ message: 'La categoría ya existe' });
    }

    const category = new Category({ name });
    await category.save();
    res.status(201).json(category);
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

    const exists = await Category.findOne({
      _id: { $ne: id },
      isActive: true,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (exists) {
      return res.status(409).json({ message: 'La categoría ya existe' });
    }

    const category = await Category.findByIdAndUpdate(id, { name }, { new: true });
    if (!category) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json(category);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'La categoría ya existe' });
    }
    res.status(400).json({ message: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!category) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json({ message: 'Categoría desactivada' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
