import { Request, Response } from 'express';
import * as catalogService from '../services/catalogService';
import { normalizeProductMedia } from '../../../shared/utils/mediaUrl';

const toPlain = (item: any) => (typeof item?.toObject === 'function' ? item.toObject() : item);

export const getCatalogController = async (req: Request, res: Response) => {
  try {
    const result = await catalogService.getCatalogProducts(req.query || {});
    res.json({
      ...result,
      items: result.items.map((item: any) => normalizeProductMedia(toPlain(item))),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCatalogProductController = async (req: Request, res: Response) => {
  try {
    const product = await catalogService.getCatalogProductByIdOrSlug(req.params.slug);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(normalizeProductMedia(toPlain(product)));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCatalogCategoriesController = async (_req: Request, res: Response) => {
  try {
    const categories = await catalogService.getCatalogCategories();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeaturedProductsController = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 8;
    const products = await catalogService.getFeaturedProducts(limit);
    res.json(products.map((item: any) => normalizeProductMedia(toPlain(item))));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
