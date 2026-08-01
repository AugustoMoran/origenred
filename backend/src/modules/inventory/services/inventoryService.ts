import Product, { IProduct } from '../models/Product';
import Branch from '../../branches/models/Branch';
import BranchStock from '../../stock/models/BranchStock';
import { adjustStock } from '../../stock/services/stockService';
import { MovementType } from '../../stock/models/StockMovement';
import Supplier from '../../suppliers/models/Supplier';

interface BranchStockInput {
  branchId: string;
  initialStock: number;
}

type BulkScope = 'selected' | 'filtered';

interface BulkCostUpdatePayload {
  percentage: number;
  scope: BulkScope;
  selectedIds?: string[];
  excludedIds?: string[];
  filters?: {
    search?: string;
    category?: string;
    supplier?: string;
  };
}

interface ProductCostPreviewItem {
  id: string;
  name: string;
  sku: string;
  oldCostPrice: number;
  newCostPrice: number;
  oldPrice: number;
  newPrice: number;
  margin: number;
  iva: number;
}

const generateSku = async () => {
  let sku = '';
  let exists = true;

  while (exists) {
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    sku = `PRD-${Date.now().toString().slice(-6)}-${random}`;
    exists = !!(await Product.exists({ sku }));
  }

  return sku;
};

const slugify = (text: string) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const generateUniqueSlug = async (name: string, excludeId?: string) => {
  const base = slugify(name) || 'producto';
  let slug = base;
  let counter = 1;

  while (true) {
    const query: any = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Product.exists(query);
    if (!exists) break;
    slug = `${base}-${counter++}`;
  }

  return slug;
};

export const getProducts = async (query: any = {}) => {
  const filters = buildProductFilters(query);

  try {
    return await Product.find(filters)
      .populate('supplier', 'name')
      .sort({ name: 1 });
  } catch (error: any) {
    console.warn('No se pudo poblar proveedores en inventario. Se devuelve listado sin populate:', error?.message || error);
    return await Product.find(filters).sort({ name: 1 });
  }
};

const buildProductFilters = (query: any = {}) => {
  const filters: any = { isActive: true };

  if (query.category) {
    filters.category = String(query.category).trim();
  }

  if (query.supplier) {
    filters.supplier = String(query.supplier).trim();
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filters.$or = [
        { name: regex },
        { sku: regex },
        { barcode: regex },
      ];
    }
  }

  return filters;
};

const recalculatePriceKeepingMargin = (costPrice: number, margin: number, iva: number) => {
  const base = costPrice + (costPrice * (margin / 100));
  const total = base * (1 + (iva / 100));
  return Number(total.toFixed(2));
};

const resolveBulkCandidateFilters = (payload: BulkCostUpdatePayload) => {
  const { scope, selectedIds = [], excludedIds = [], filters: incomingFilters = {} } = payload;

  if (scope === 'selected') {
    const normalizedSelectedIds = selectedIds
      .map((id) => String(id || '').trim())
      .filter(Boolean);

    if (!normalizedSelectedIds.length) {
      throw new Error('Debe seleccionar al menos un producto');
    }

    return { isActive: true, _id: { $in: normalizedSelectedIds } } as any;
  }

  const filters = buildProductFilters(incomingFilters || {});
  const normalizedExcludedIds = excludedIds
    .map((id) => String(id || '').trim())
    .filter(Boolean);

  if (normalizedExcludedIds.length) {
    filters._id = { $nin: normalizedExcludedIds };
  }

  return filters;
};

const buildBulkPreviewItems = (products: any[], percentage: number): ProductCostPreviewItem[] => {
  return products.map((product) => {
    const oldCostPrice = Number(product.costPrice ?? 0);
    const oldPrice = Number(product.price ?? 0);
    const margin = Number(product.margin ?? 0);
    const iva = Number(product.iva ?? 21);

    const increasedCost = oldCostPrice * (1 + (percentage / 100));
    const newCostPrice = Number(Math.max(0, increasedCost).toFixed(2));
    const newPrice = recalculatePriceKeepingMargin(newCostPrice, margin, iva);

    return {
      id: String(product._id),
      name: String(product.name || '-'),
      sku: String(product.sku || '-'),
      oldCostPrice,
      newCostPrice,
      oldPrice,
      newPrice,
      margin,
      iva,
    };
  });
};

const validateBulkPercentage = (percentage: number) => {
  if (!Number.isFinite(percentage)) {
    throw new Error('El porcentaje debe ser un número válido');
  }

  if (percentage <= -100 || percentage > 500) {
    throw new Error('El porcentaje debe estar entre -99.99 y 500');
  }
};

export const previewBulkCostUpdate = async (payload: BulkCostUpdatePayload) => {
  const percentage = Number(payload?.percentage);
  validateBulkPercentage(percentage);

  const filters = resolveBulkCandidateFilters(payload);

  const products = await Product.find(filters)
    .select('_id name sku costPrice margin iva price')
    .sort({ name: 1 });

  const previewItems = buildBulkPreviewItems(products, percentage);
  const sample = previewItems.slice(0, 25);

  return {
    affectedCount: previewItems.length,
    percentage,
    strategy: 'keep_margin_and_recalculate_price',
    sample,
  };
};

export const applyBulkCostUpdate = async (payload: BulkCostUpdatePayload) => {
  const percentage = Number(payload?.percentage);
  validateBulkPercentage(percentage);

  const filters = resolveBulkCandidateFilters(payload);

  const products = await Product.find(filters)
    .select('_id costPrice margin iva price')
    .sort({ name: 1 });

  if (!products.length) {
    return {
      affectedCount: 0,
      percentage,
      strategy: 'keep_margin_and_recalculate_price',
    };
  }

  const updates = buildBulkPreviewItems(products as any[], percentage);
  const now = new Date();

  await Product.bulkWrite(
    updates.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: {
          $set: {
            costPrice: item.newCostPrice,
            price: item.newPrice,
            updatedAt: now,
          },
        },
      },
    }))
  );

  return {
    affectedCount: updates.length,
    percentage,
    strategy: 'keep_margin_and_recalculate_price',
  };
};

export const getProductById = async (id: string) => {
  return await Product.findById(id);
};

export const createProduct = async (productData: Partial<IProduct> & { branchStocks?: BranchStockInput[] }, user: any) => {
  const normalizedSku = (productData.sku || '').toString().trim().toUpperCase();
  productData.sku = normalizedSku || (await generateSku());
  productData.slug = productData.slug
    ? slugify(String(productData.slug))
    : await generateUniqueSlug(String(productData.name || productData.sku));

  const branchStocks = Array.isArray((productData as any).branchStocks)
    ? (productData as any).branchStocks
    : [];

  const isAdmin = Array.isArray(user?.roles) && user.roles.includes('admin');

  if ((productData as any).supplier) {
    const supplier = await Supplier.findOne({ _id: (productData as any).supplier, isActive: true }).select('_id');
    if (!supplier) {
      throw new Error('Proveedor inválido o inactivo');
    }
  }

  if (isAdmin && !branchStocks.length) {
    throw new Error('Debe asignar al menos una sucursal con stock inicial');
  }

  if (!isAdmin && branchStocks.length) {
    throw new Error('Solo un administrador puede distribuir stock inicial por sucursal');
  }

  const normalizedBranchStocks: BranchStockInput[] = branchStocks.map((entry: any) => ({
    branchId: String(entry?.branchId || '').trim(),
    initialStock: Number(entry?.initialStock ?? 0),
  }));

  let uniqueBranchIds: string[] = [];

  if (normalizedBranchStocks.length) {
    const invalidBranch = normalizedBranchStocks.find((entry) => !entry.branchId);
    if (invalidBranch) {
      throw new Error('Todas las filas de asignación deben tener sucursal');
    }

    const invalidQty = normalizedBranchStocks.find((entry) => !Number.isFinite(entry.initialStock) || entry.initialStock < 0);
    if (invalidQty) {
      throw new Error('El stock inicial por sucursal debe ser un número mayor o igual a 0');
    }

    uniqueBranchIds = Array.from(new Set(normalizedBranchStocks.map((entry) => entry.branchId)));
    if (uniqueBranchIds.length !== normalizedBranchStocks.length) {
      throw new Error('No puede repetir la misma sucursal en la asignación inicial');
    }

    const activeBranches = await Branch.find({ _id: { $in: uniqueBranchIds }, isActive: true }).select('_id');
    if (activeBranches.length !== uniqueBranchIds.length) {
      throw new Error('Una o más sucursales seleccionadas no existen o están inactivas');
    }
  }

  const minStock = Number((productData as any).minStock ?? 0);

  (productData as any).stock = 0;
  delete (productData as any).branchStocks;

  const product = new Product(productData);
  const savedProduct = await product.save();

  const creatorId = String(user?._id || user?.id || '');

  for (const entry of normalizedBranchStocks) {
    await BranchStock.findOneAndUpdate(
      { product: savedProduct._id, branch: entry.branchId },
      { $set: { minStock } },
      { upsert: true, new: true }
    );

    if (entry.initialStock > 0) {
      await adjustStock({
        productId: String(savedProduct._id),
        branchId: entry.branchId,
        quantity: entry.initialStock,
        type: MovementType.MANUAL_ADJUSTMENT,
        userId: creatorId,
        notes: 'Stock inicial al crear producto',
      });
    }
  }

  return await Product.findById(savedProduct._id).populate('supplier', 'name');
};

export const updateProduct = async (id: string, updateData: Partial<IProduct>) => {
  if ('sku' in updateData) {
    const normalizedSku = (updateData.sku || '').toString().trim().toUpperCase();
    if (normalizedSku) {
      updateData.sku = normalizedSku as any;
    } else {
      delete (updateData as any).sku;
    }
  }

  if ('supplier' in (updateData as any)) {
    const supplierId = (updateData as any).supplier;
    if (supplierId) {
      const supplier = await Supplier.findOne({ _id: supplierId, isActive: true }).select('_id');
      if (!supplier) {
        throw new Error('Proveedor inválido o inactivo');
      }
    } else {
      (updateData as any).supplier = undefined;
    }
  }

  if ('name' in updateData && updateData.name) {
    if ('slug' in updateData && updateData.slug) {
      (updateData as any).slug = slugify(String(updateData.slug));
    } else {
      (updateData as any).slug = await generateUniqueSlug(String(updateData.name), id);
    }
  } else if ('slug' in updateData && updateData.slug) {
    (updateData as any).slug = slugify(String(updateData.slug));
  }

  return await Product.findByIdAndUpdate(id, updateData, { new: true }).populate('supplier', 'name');
};

export const updateStock = async (id: string, quantity: number, type: 'add' | 'remove') => {
  const multiplier = type === 'add' ? 1 : -1;
  return await Product.findByIdAndUpdate(
    id,
    { $inc: { stock: quantity * multiplier } },
    { new: true }
  );
};

export const deleteProduct = async (id: string) => {
  // Soft delete para mantener historia de ventas
  return await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
};
