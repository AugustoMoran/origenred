import { Request, Response } from 'express';
import * as inventoryService from '../services/inventoryService';
import { deleteImage } from '../../../middleware/uploadMiddleware';
import fs from 'fs';
import path from 'path';
import {
  applyEcommerceFieldsToProductData,
  getMainUploadedImage,
  getUploadedFiles,
} from '../utils/productFormParser';
import { deleteFromR2 } from '../../marketplace/services/r2StorageService';
import { isR2ObjectKey } from '../../../shared/utils/mediaUrl';
import { applyInventoryImagesToProductData } from '../utils/inventoryImageUpload';
import { Listing } from '../../marketplace/models/Listing';
import { prepareProductForClient } from '../services/productMediaRepairService';

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

const toPlainProduct = (product: unknown) =>
  product && typeof (product as { toObject?: () => Record<string, unknown> }).toObject === 'function'
    ? (product as { toObject: () => Record<string, unknown> }).toObject()
    : product;

const toClientProduct = (req: Request, product: unknown, listing?: { images?: unknown[] } | null) => {
  const plain = toPlainProduct(product) as Record<string, unknown>;
  return prepareProductForClient(plain, listing as any, req);
};

export const getProductsController = async (req: Request, res: Response) => {
  try {
    const products = await inventoryService.getProducts(req.query || {});
    const ids = products.map((p: any) => p._id);
    const listings = await Listing.find({ inventoryProductId: { $in: ids } }).select('inventoryProductId images');
    const listingByProduct = new Map(
      listings.map((l) => [String(l.inventoryProductId), l])
    );
    const payload = products.map((p: any) =>
      toClientProduct(req, p, listingByProduct.get(String(p._id)))
    );
    res.json(payload);
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
    res.status(201).json(product ? toClientProduct(req, product as any) : product);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProductController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productData = applyEcommerceFieldsToProductData(req, { ...req.body });
    parseSupplierField(productData);

    const uploads = getUploadedFiles(req);
    const newMainImage = Boolean(uploads.image?.length);
    const newGalleryImages = Boolean(uploads.galleryImages?.length);
    if (newMainImage || newGalleryImages) {
      if (newMainImage) {
        const oldProduct = await inventoryService.getProductById(id);

        if (oldProduct?.imagePublicId && isR2ObjectKey(oldProduct.imagePublicId)) {
          await deleteFromR2(oldProduct.imagePublicId).catch(() => undefined);
        } else if (oldProduct?.imagePublicId && isHttpUrl(oldProduct.imageUrl || '')) {
          await deleteImage(oldProduct.imagePublicId);
        }

        deleteLocalImageFromUrl(oldProduct?.imageUrl);
      }
      await applyInventoryImagesToProductData(req, productData);
    }

    const product = await inventoryService.updateProduct(id, productData, (req as any).user);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(toClientProduct(req, product as any));
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
    const product = await inventoryService.updateStock(id, quantity, type, (req as any).user);
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resyncMarketplaceController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await inventoryService.resyncInventoryToMarketplace(user);
    res.json({
      message: `Se sincronizaron ${result.synced} productos del inventario con el marketplace.`,
      ...result,
    });
  } catch (error: any) {
    res.status(error.message?.includes('Solo administradores') ? 403 : 400).json({ message: error.message });
  }
};

export const repairProductMediaController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await inventoryService.repairInventoryProductMedia(user);
    res.json({
      message: `Reparación completada: ${result.repairedProducts} productos actualizados (${result.repairedFromListing} desde marketplace). ${result.stillMissing} siguen sin imagen recuperable.`,
      ...result,
    });
  } catch (error: any) {
    res.status(error.message?.includes('Solo administradores') ? 403 : 400).json({ message: error.message });
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
