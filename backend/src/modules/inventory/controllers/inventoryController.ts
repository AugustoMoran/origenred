import { Request, Response } from 'express';
import * as inventoryService from '../services/inventoryService';
import { deleteImage } from '../../../middleware/uploadMiddleware';
import fs from 'fs';
import path from 'path';
import {
  applyEcommerceFieldsToProductData,
  getMainUploadedImage,
} from '../utils/productFormParser';
import { applyInventoryImagesToProductData } from '../utils/inventoryImageUpload';

const isHttpUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);

const deleteLocalImageFromUrl = (imageUrl?: string) => {
  if (!imageUrl || !imageUrl.includes('/uploads/')) return;

  try {
    const filename = imageUrl.split('/uploads/').pop();
    if (!filename) return;

    const fullPath = path.resolve(process.cwd(), 'uploads', filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.warn('No se pudo eliminar imagen local previa:', error);
  }
};

const parseSupplierField = (productData: Record<string, any>) => {
  if ('supplier' in productData) {
    if (!productData.supplier || String(productData.supplier).trim() === '') {
      delete productData.supplier;
    } else {
      productData.supplier = String(productData.supplier).trim();
    }
  }
};

export const getProductsController = async (req: Request, res: Response) => {
  try {
    const products = await inventoryService.getProducts(req.query || {});
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createProductController = async (req: Request, res: Response) => {
  try {
    const productData = applyEcommerceFieldsToProductData(req, { ...req.body });

    if (typeof productData.branchStocks === 'string') {
      try {
        productData.branchStocks = JSON.parse(productData.branchStocks);
      } catch {
        return res.status(400).json({ message: 'Formato inválido para asignación de sucursales' });
      }
    }

    parseSupplierField(productData);
    await applyInventoryImagesToProductData(req, productData);

    const product = await inventoryService.createProduct(productData, (req as any).user);
    res.status(201).json(product);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProductController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productData = applyEcommerceFieldsToProductData(req, { ...req.body });
    parseSupplierField(productData);

    if (getMainUploadedImage(req)) {
      const oldProduct = await inventoryService.getProductById(id);

      if (oldProduct?.imagePublicId && isHttpUrl(oldProduct.imageUrl || '')) {
        await deleteImage(oldProduct.imagePublicId);
      }

      deleteLocalImageFromUrl(oldProduct?.imageUrl);
      await applyInventoryImagesToProductData(req, productData);
    }

    const product = await inventoryService.updateProduct(id, productData);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProductController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await inventoryService.deleteProduct(id);
    res.json({ message: 'Producto eliminado (desactivado) con éxito' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const adjustStockController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, type } = req.body;
    const product = await inventoryService.updateStock(id, quantity, type);
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const bulkCostUpdateController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isAdmin = Array.isArray(user?.roles) && user.roles.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({ message: 'Solo administradores pueden aplicar aumentos masivos de costo' });
    }

    const dryRun = Boolean(req.body?.dryRun);
    const payload = {
      percentage: Number(req.body?.percentage),
      scope: req.body?.scope,
      selectedIds: req.body?.selectedIds,
      excludedIds: req.body?.excludedIds,
      filters: req.body?.filters,
    };

    if (dryRun) {
      const result = await inventoryService.previewBulkCostUpdate(payload as any);
      return res.json({ ...result, dryRun: true });
    }

    const result = await inventoryService.applyBulkCostUpdate(payload as any);
    return res.json({ ...result, dryRun: false });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
