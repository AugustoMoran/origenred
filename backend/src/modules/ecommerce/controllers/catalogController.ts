import { Request, Response } from 'express';
import * as catalogService from '../services/catalogService';

export const getCatalogController = async (req: Request, res: Response) => {
  try {
    const result = await catalogService.getCatalogProducts(req.query || {});
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCatalogProductController = async (req: Request, res: Response) => {
  try {
    const product = await catalogService.getCatalogProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
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
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
