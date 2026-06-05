import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  useGetProductsQuery, 
  useCreateProductMutation, 
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAdjustStockMutation,
  useManualAdjustMutation,
  useGetProductStockByBranchQuery,
  usePreviewBulkCostUpdateMutation,
  useApplyBulkCostUpdateMutation,
} from '../services/inventoryApi';
import { useGetBranchesQuery } from '../services/branchApi';
import { useGetCategoriesQuery } from '../services/categoryApi';
import { useGetSuppliersQuery } from '../services/supplierApi';
import { HasPermission } from '../components/auth/HasPermission';
import { PERMISSIONS } from '../constants/permissions';

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  price: number | '';
  costPrice: number | '';
  iva: number;
  margin: number | '';
  stock: number | '';
  minStock: number | '';
  category: string;
  supplier: string;
  barcode: string;
  internalCode: string;
}

interface BranchAssignmentForm {
  branchId: string;
  initialStock: number | '';
}

interface BulkPreviewResult {
  affectedCount: number;
  percentage: number;
  strategy: string;
  sample: Array<{
    id: string;
    name: string;
    sku: string;
    oldCostPrice: number;
    newCostPrice: number;
    oldPrice: number;
    newPrice: number;
  }>;
}

const StockCell = ({ product }: { product: any }) => {
  const { data: branchStocks, isLoading } = useGetProductStockByBranchQuery(product._id);

  const getBranchLabel = (stockItem: any) => {
    const branchRef = stockItem?.branch ?? stockItem?.branchId;

    if (branchRef && typeof branchRef === 'object' && branchRef.name) {
      return String(branchRef.name);
    }

    if (typeof stockItem?.branchName === 'string' && stockItem.branchName.trim()) {
      return stockItem.branchName.trim();
    }

    return 'Sucursal';
  };

  const getBranchKey = (stockItem: any, idx: number) => {
    const branchRef = stockItem?.branch ?? stockItem?.branchId;

    if (typeof branchRef === 'string' || typeof branchRef === 'number') {
      return `${branchRef}`;
    }

    if (branchRef && typeof branchRef === 'object' && branchRef._id) {
      return String(branchRef._id);
    }

    return `stock-row-${idx}`;
  };

  const getBranchQuantity = (stockItem: any) => {
    if (typeof stockItem?.stock === 'number') return stockItem.stock;
    if (typeof stockItem?.quantity === 'number') return stockItem.quantity;

    const parsedFromStock = Number(stockItem?.stock);
    if (Number.isFinite(parsedFromStock)) return parsedFromStock;

    const parsedFromQuantity = Number(stockItem?.quantity);
    if (Number.isFinite(parsedFromQuantity)) return parsedFromQuantity;

    return 0;
  };

  const branchTotal = Array.isArray(branchStocks)
    ? branchStocks.reduce((acc: number, item: any) => acc + getBranchQuantity(item), 0)
    : null;

  const displayTotal = branchTotal !== null ? branchTotal : product.stock;
  
  return (
    <div className="space-y-1.5 min-w-[170px] mx-auto">
      <div className="flex items-center justify-center gap-1 text-[11px]">
        <span className="text-slate-400">Total:</span>
        <span className={`font-bold ${displayTotal <= product.minStock ? 'text-rose-400' : 'text-emerald-400'}`}>
          {displayTotal}
        </span>
      </div>

      {isLoading ? (
        <div className="text-[10px] text-slate-500 text-center">Cargando sucursales...</div>
      ) : branchStocks && branchStocks.length > 0 ? (
        <div className="space-y-1">
          {branchStocks.map((bs: any, idx: number) => {
            const branchLabel = getBranchLabel(bs);
            const branchQty = getBranchQuantity(bs);
            return (
              <div
                key={getBranchKey(bs, idx)}
                className="flex items-center justify-between gap-2 rounded-md bg-slate-800/80 px-2 py-1 text-[10px]"
                title={`Sucursal ${branchLabel}: ${branchQty}`}
              >
                <span className="text-slate-300 truncate max-w-[110px]">{branchLabel}</span>
                <span className={`font-bold tabular-nums ${branchQty < 0 ? 'text-rose-400' : 'text-white'}`}>{branchQty}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[10px] text-slate-500 text-center">Sin stock por sucursal</div>
      )}
    </div>
  );
};

export const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const hasActiveFilters = Boolean(searchTerm || categoryFilter || supplierFilter);
  const [bulkPercentage, setBulkPercentage] = useState('');
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [excludedProductIds, setExcludedProductIds] = useState<Set<string>>(new Set());
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewResult | null>(null);

  const { data: products, isLoading, error } = useGetProductsQuery({
    search: searchTerm || undefined,
    category: categoryFilter || undefined,
    supplier: supplierFilter || undefined,
  });
  const { data: branches } = useGetBranchesQuery({});
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [manualAdjust] = useManualAdjustMutation();
  const [previewBulkCostUpdate, { isLoading: isPreviewingBulk }] = usePreviewBulkCostUpdateMutation();
  const [applyBulkCostUpdate, { isLoading: isApplyingBulk }] = useApplyBulkCostUpdateMutation();
  const { user, token } = useSelector((state: any) => state.auth);
  
  const isAdmin = Array.isArray(user?.roles) ? user.roles.includes('admin') : user?.role === 'admin';
  const productsList = products ?? [];

  const visibleProductIds = useMemo(
    () => productsList.map((p: any) => String(p._id)),
    [productsList]
  );

  useEffect(() => {
    const visibleIdsSet = new Set(visibleProductIds);

    setSelectedProductIds((prev) => new Set(Array.from(prev).filter((id) => visibleIdsSet.has(id))));
    setExcludedProductIds((prev) => new Set(Array.from(prev).filter((id) => visibleIdsSet.has(id))));
  }, [visibleProductIds]);

  useEffect(() => {
    setBulkPreview(null);
  }, [searchTerm, categoryFilter, supplierFilter, bulkPercentage, selectAllFiltered, selectedProductIds, excludedProductIds]);

  const isRowSelected = (productId: string) => {
    return selectAllFiltered ? !excludedProductIds.has(productId) : selectedProductIds.has(productId);
  };

  const selectedCount = selectAllFiltered
    ? Math.max(0, productsList.length - excludedProductIds.size)
    : selectedProductIds.size;

  const allVisibleSelected = productsList.length > 0 && productsList.every((p: any) => isRowSelected(String(p._id)));

  const toggleRowSelection = (productId: string) => {
    if (selectAllFiltered) {
      setExcludedProductIds((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        return next;
      });
      return;
    }

    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleSelectVisible = () => {
    if (selectAllFiltered) {
      setExcludedProductIds((prev) => {
        const next = new Set(prev);
        if (allVisibleSelected) {
          productsList.forEach((p: any) => next.add(String(p._id)));
        } else {
          productsList.forEach((p: any) => next.delete(String(p._id)));
        }
        return next;
      });
      return;
    }

    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        productsList.forEach((p: any) => next.delete(String(p._id)));
      } else {
        productsList.forEach((p: any) => next.add(String(p._id)));
      }
      return next;
    });
  };

  const activateFilteredSelection = () => {
    setSelectAllFiltered(true);
    setSelectedProductIds(new Set());
    setExcludedProductIds(new Set());
  };

  const clearBulkSelection = () => {
    setSelectAllFiltered(false);
    setSelectedProductIds(new Set());
    setExcludedProductIds(new Set());
    setBulkPreview(null);
  };

  const getBulkPayload = () => {
    const percentage = Number(String(bulkPercentage).replace(',', '.'));
    if (!Number.isFinite(percentage)) {
      throw new Error('Ingrese un porcentaje válido');
    }

    if (percentage <= -100 || percentage > 500) {
      throw new Error('El porcentaje debe estar entre -99.99 y 500');
    }

    if (selectAllFiltered) {
      if (!productsList.length) {
        throw new Error('No hay productos filtrados para actualizar');
      }

      return {
        percentage,
        scope: 'filtered',
        filters: {
          search: searchTerm || undefined,
          category: categoryFilter || undefined,
          supplier: supplierFilter || undefined,
        },
        excludedIds: Array.from(excludedProductIds),
      };
    }

    if (!selectedProductIds.size) {
      throw new Error('Debe seleccionar al menos un producto');
    }

    return {
      percentage,
      scope: 'selected',
      selectedIds: Array.from(selectedProductIds),
    };
  };

  const handleBulkPreview = async () => {
    try {
      const payload = getBulkPayload();
      const result = await previewBulkCostUpdate(payload).unwrap();
      setBulkPreview(result);
    } catch (error: any) {
      alert(error?.data?.message || error?.message || 'Error al previsualizar aumento masivo');
    }
  };

  const handleBulkApply = async () => {
    try {
      const payload = getBulkPayload();
      const confirmation = window.confirm(
        `Se actualizará el costo de ${selectedCount} producto(s) con ${payload.percentage}% y se recalculará precio manteniendo margen. ¿Desea continuar?`
      );
      if (!confirmation) return;

      const result = await applyBulkCostUpdate(payload).unwrap();
      alert(`Actualización aplicada correctamente. Productos afectados: ${result.affectedCount}`);
      clearBulkSelection();
      setBulkPercentage('');
    } catch (error: any) {
      alert(error?.data?.message || error?.message || 'Error al aplicar aumento masivo');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [branchAssignments, setBranchAssignments] = useState<BranchAssignmentForm[]>([]);
  const [priceDriver, setPriceDriver] = useState<'margin' | 'price'>('margin');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '', sku: '', description: '', price: '', costPrice: '', iva: 21, margin: '', stock: '', minStock: '', category: '', supplier: '', barcode: '', internalCode: ''
  });

  const toNum = (value: any) => {
    if (value === '' || value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getDefaultAssignments = (): BranchAssignmentForm[] => {
    return [];
  };

  const openCreateModal = () => {
    resetForm();
    setBranchAssignments(getDefaultAssignments());
    setShowModal(true);
  };

  const syncPriceAndMargin = (base: ProductFormData, source: 'margin' | 'price'): ProductFormData => {
    const cost = toNum(base.costPrice);
    const iva = toNum(base.iva);

    if (source === 'margin') {
      if (base.margin === '' && base.costPrice === '') {
        return { ...base, price: '' };
      }

      const calculatedPrice = calculatePrice(cost, toNum(base.margin), iva);
      return { ...base, price: calculatedPrice };
    }

    if (base.price === '') {
      return { ...base, margin: '' };
    }

    const calculatedMargin = calculateMargin(cost, toNum(base.price), iva);
    return { ...base, margin: calculatedMargin };
  };

  const updateNumericField = (field: 'costPrice' | 'margin' | 'iva' | 'price' | 'stock' | 'minStock', raw: string) => {
    const parsedValue = raw === '' ? '' : Number(raw.replace(',', '.'));

    setFormData((prev) => ({
      ...prev,
      [field]: raw === '' ? '' : (Number.isFinite(parsedValue) ? parsedValue : ''),
    } as ProductFormData));
  };

  const handleNumberWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).blur();
  };

  const calculatePrice = (cost: number, margin: number, iva: number) => {
    const base = cost + (cost * (margin / 100));
    const total = base * (1 + (iva / 100));
    return Number(total.toFixed(2));
  };

  const calculateMargin = (cost: number, price: number, iva: number) => {
    if (cost === 0) return 0;
    const base = price / (1 + (iva / 100));
    const margin = ((base - cost) / cost) * 100;
    return Number(margin.toFixed(2));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', sku: '', description: '', price: '', costPrice: '', 
      iva: 21, margin: '', stock: '', minStock: '', category: '', supplier: '',
      barcode: '', internalCode: ''
    });
    setSelectedFile(null);
    setImagePreview(null);
    setIsEditing(false);
    setCurrentId(null);
    setBranchAssignments(getDefaultAssignments());
    setPriceDriver('margin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      alert('Debe seleccionar una categoría');
      return;
    }

    if (!isEditing && isAdmin) {
      const normalizedAssignments = branchAssignments
        .filter((item) => item.branchId)
        .map((item) => ({
          branchId: item.branchId,
          initialStock: Math.max(0, toNum(item.initialStock)),
        }));

      if (!normalizedAssignments.length) {
        alert('Debe asignar al menos una sucursal para el stock inicial');
        return;
      }

      const uniqueBranchIds = new Set(normalizedAssignments.map((item) => item.branchId));
      if (uniqueBranchIds.size !== normalizedAssignments.length) {
        alert('No puede repetir la misma sucursal en la asignación inicial');
        return;
      }
    }

    const data = new FormData();
    const numericFields = new Set(['price', 'costPrice', 'iva', 'margin', 'stock', 'minStock']);
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'supplier' && !value) return;
      if (value !== undefined && value !== null) {
        if (numericFields.has(key)) {
          data.append(key, toNum(value).toString());
        } else {
          data.append(key, value.toString());
        }
      }
    });

    if (!isEditing && isAdmin) {
      const payloadAssignments = branchAssignments
        .filter((item) => item.branchId)
        .map((item) => ({
          branchId: item.branchId,
          initialStock: Math.max(0, toNum(item.initialStock)),
        }));

      data.set('stock', '0');
      data.append('branchStocks', JSON.stringify(payloadAssignments));
    } else if (!isEditing) {
      data.set('stock', '0');
    }

    if (selectedFile) data.append('image', selectedFile);

    try {
      if (isEditing && currentId) {
        await updateProduct({ id: currentId, body: data }).unwrap();
      } else {
        await createProduct(data).unwrap();
      }
      setShowModal(false);
      resetForm();
    } catch {
      alert('Error al guardar producto');
    }
  };

  const handleEdit = (p: any) => {
    setFormData({
      name: p.name,
      sku: p.sku,
      description: p.description || '',
      price: p.price,
      costPrice: p.costPrice,
      iva: p.iva ?? 21,
      margin: p.margin || 0,
      stock: p.stock,
      minStock: p.minStock,
      category: p.category || '',
      supplier: typeof p.supplier === 'object' ? (p.supplier?._id || '') : (p.supplier || ''),
      barcode: p.barcode || '',
      internalCode: p.internalCode || ''
    });
    setImagePreview(p.imageUrl);
    setIsEditing(true);
    setCurrentId(p._id);
    setBranchAssignments([]);
    setPriceDriver('margin');
    setShowModal(true);
  };

  const handleStockAdjust = async (productId: string) => {
    if (!isAdmin) return;

    if (!branches || branches.length === 0) {
      alert('Debe crear al menos una sucursal para ajustar el stock');
      return;
    }

    const branchOptions = branches
      .map((b: any, idx: number) => `${idx + 1}) ${b.name}`)
      .join('\n');

    const branchInput = prompt(
      `Seleccione sucursal (número o nombre):\n${branchOptions}`
    );

    if (branchInput === null) return;

    const normalizedBranchInput = branchInput.trim();
    const selectedIndex = Number(normalizedBranchInput);

    const branch = Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= branches.length
      ? branches[selectedIndex - 1]
      : branches.find((b: any) => b.name.trim().toLowerCase() === normalizedBranchInput.toLowerCase());
    
    if (!branch) {
      alert('Sucursal no encontrada');
      return;
    }

    let currentBranchStock = 0;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/stock/product/${productId}`,
        {
          headers: {
            authorization: token ? `Bearer ${token}` : '',
          },
        }
      );

      if (response.ok) {
        const rows = await response.json();
        const found = Array.isArray(rows)
          ? rows.find((row: any) => {
              const rowBranch = row?.branch;
              const rowBranchId =
                typeof rowBranch === 'string'
                  ? rowBranch
                  : rowBranch?._id || row?.branchId;
              return String(rowBranchId) === String(branch._id);
            })
          : null;

        const stockValue = Number(found?.stock ?? found?.quantity ?? 0);
        currentBranchStock = Number.isFinite(stockValue) ? stockValue : 0;
      }
    } catch {
      // Si falla la lectura, se mantiene 0 como fallback
    }

    const targetStockInput = prompt(
      `Stock actual en ${branch.name}: ${currentBranchStock}\nIngrese el nuevo stock final para esta sucursal:`,
      String(currentBranchStock)
    );
    if (targetStockInput === null) return;

    const normalizedTarget = targetStockInput.trim().replace(',', '.');
    if (!normalizedTarget.length || Number.isNaN(Number(normalizedTarget))) {
      alert('Stock inválido');
      return;
    }

    const targetStock = Number(normalizedTarget);
    if (targetStock < 0) {
      alert('El stock final no puede ser negativo');
      return;
    }

    const delta = targetStock - currentBranchStock;
    if (delta === 0) {
      alert('No hay cambios para aplicar');
      return;
    }

    const quantity = Math.abs(delta);
    const type = delta >= 0 ? 'add' : 'remove';

    try {
      await manualAdjust({
        productId,
        branchId: branch._id,
        quantity,
        type,
        notes: `Ajuste manual desde panel administrativo (${currentBranchStock} → ${targetStock})`
      }).unwrap();
    } catch (err: any) {
      alert('Error al ajustar stock: ' + (err.data?.message || err.message));
    }
  };

  if (isLoading) return (
    <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Cargando inventario...
    </div>
  );
  if (error) return <div className="badge-red p-4">Error al cargar productos</div>;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-sub">Gestión de stock y productos</p>
        </div>
        <HasPermission permission={PERMISSIONS.INVENTORY_EDIT}>
          <button onClick={openCreateModal} className="btn-primary w-full sm:w-auto justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo producto
          </button>
        </HasPermission>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total productos', value: products?.length ?? 0, color: 'text-white' },
          { label: 'Stock bajo mínimo', value: products?.filter((p: any) => p.stock <= p.minStock).length ?? 0, color: 'text-amber-400' },
          { label: 'Unidades totales', value: products?.reduce((a: number, p: any) => a + p.stock, 0) ?? 0, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre / SKU / código"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c: any) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            className="input"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((s: any) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasActiveFilters}
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setSupplierFilter('');
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="card p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <button
              type="button"
              className={`btn-secondary ${selectAllFiltered ? '!bg-brand-500/20 !border-brand-500/40 !text-brand-300' : ''}`}
              onClick={activateFilteredSelection}
            >
              Seleccionar todos los filtrados
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={toggleSelectVisible}
              disabled={!productsList.length}
            >
              {allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={clearBulkSelection}
              disabled={!selectedCount && !selectAllFiltered}
            >
              Limpiar selección
            </button>

            <div className="text-xs text-slate-400 lg:ml-auto">
              Seleccionados: <span className="font-bold text-white">{selectedCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="section-heading">Aumento de costo (%)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="Ej: 12.5"
                value={bulkPercentage}
                onChange={(e) => setBulkPercentage(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Estrategia: mantener margen y recalcular precio final con IVA.
              </p>
            </div>
            <div className="lg:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <button
                type="button"
                className="btn-secondary flex-1"
                disabled={isPreviewingBulk || !selectedCount}
                onClick={handleBulkPreview}
              >
                {isPreviewingBulk ? 'Previsualizando...' : 'Previsualizar cambios'}
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={isApplyingBulk || !selectedCount}
                onClick={handleBulkApply}
              >
                {isApplyingBulk ? 'Aplicando...' : 'Aplicar aumento masivo'}
              </button>
            </div>
          </div>

          {bulkPreview && (
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 space-y-3">
              <p className="text-sm text-slate-300">
                Se actualizarán <span className="font-bold text-white">{bulkPreview.affectedCount}</span> productos con
                <span className="font-bold text-brand-300"> {bulkPreview.percentage}%</span>.
              </p>
              <div className="overflow-x-auto">
                <table className="data-table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th className="text-right">Costo actual</th>
                      <th className="text-right">Costo nuevo</th>
                      <th className="text-right">Precio actual</th>
                      <th className="text-right">Precio nuevo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.sample?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td className="font-mono text-xs text-slate-400">{item.sku}</td>
                        <td className="text-right">${item.oldCostPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right text-amber-300">${item.newCostPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right">${item.oldPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right text-emerald-300">${item.newPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="data-table min-w-[980px]">
          <thead>
            <tr>
              {isAdmin && (
                <th className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected && productsList.length > 0}
                    onChange={toggleSelectVisible}
                    title="Seleccionar productos visibles"
                  />
                </th>
              )}
              <th className="w-16">Foto</th>
              <th>SKU</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Proveedor</th>
              <th className="text-center">Stock</th>
              <th className="text-right">Precio</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productsList.map((p: any) => (
              <tr key={p._id}>
                {isAdmin && (
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={isRowSelected(String(p._id))}
                      onChange={() => toggleRowSelection(String(p._id))}
                      title="Seleccionar producto"
                    />
                  </td>
                )}
                <td>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 ring-1 ring-white/10 flex items-center justify-center">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </td>
                <td className="font-mono text-xs text-brand-400 font-semibold">{p.sku}</td>
                <td>
                  <div className="font-medium text-white text-sm">{p.name}</div>
                  {p.description && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{p.description}</div>}
                </td>
                <td><span className="badge-gray">{p.category || 'Sin categoría'}</span></td>
                <td>
                  <span className="text-xs text-slate-300">{p.supplier?.name || 'Sin proveedor'}</span>
                </td>
                <td className="text-center">
                  <StockCell product={p} />
                </td>
                <td className="text-right font-semibold text-white transition-colors group-hover:text-brand-400">${p.price.toLocaleString()}</td>
                <td>
                  <div className="flex items-center justify-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => handleStockAdjust(p._id)}
                        className="btn-icon !text-emerald-400 hover:!bg-emerald-400/10 hover:!border-emerald-400/20"
                        title="Ajustar stock (Admin)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                    <HasPermission permission={PERMISSIONS.INVENTORY_EDIT}>
                      <button
                        onClick={() => handleEdit(p)}
                        className="btn-icon !text-sky-400 hover:!bg-sky-400/10 hover:!border-sky-400/20"
                        title="Editar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Seguro desea eliminar este producto?')) {
                            deleteProduct(p._id);
                          }
                        }}
                        className="btn-icon !text-red-400 hover:!bg-red-400/10 hover:!border-red-400/20"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </HasPermission>
                  </div>
                </td>
              </tr>
            ))}
            {productsList.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="text-center text-slate-600 py-12 text-sm">
                  No hay productos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-[#030712]/80 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative w-full max-w-2xl animate-scale-up my-3 sm:my-0">
            <div className="card p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">{isEditing ? 'Editar' : 'Nuevo'} Producto</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 flex justify-center">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-[10px] text-slate-600 font-medium">Subir foto</p>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </div>
                  </div>

                  <div>
                    <label className="section-heading">Nombre del producto</label>
                    <input type="text" className="input" placeholder="Ej: Coca Cola 500ml" required
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="section-heading">Categoría</label>
                    <select className="input" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="">Seleccionar categoría...</option>
                      {categories.map((c: any) => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="section-heading">Proveedor</label>
                    <select className="input" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })}>
                      <option value="">Sin proveedor</option>
                      {suppliers.map((s: any) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="section-heading">SKU / Código</label>
                    <input type="text" className="input" placeholder="(Opcional) Se genera automático"
                      value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                  </div>
                  <div>
                    <label className="section-heading">Código de Barras</label>
                    <input type="text" className="input" placeholder="7791234..."
                      value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
                  </div>

                  <div>
                    <label className="section-heading">Precio de costo</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      required
                      value={formData.costPrice as any}
                      onWheel={handleNumberWheel}
                      onChange={e => updateNumericField('costPrice', e.target.value)}
                      onBlur={() => setFormData((prev) => syncPriceAndMargin(prev, priceDriver))}
                    />
                  </div>
                  <div>
                    <label className="section-heading">IVA (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      placeholder="21"
                      value={formData.iva}
                      onWheel={handleNumberWheel}
                      onChange={e => updateNumericField('iva', e.target.value)}
                      onBlur={() => setFormData((prev) => syncPriceAndMargin(prev, priceDriver))}
                    />
                  </div>

                  <div>
                    <label className="section-heading">Margen de Ganancia (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      placeholder="0"
                      required
                      value={formData.margin as any}
                      onWheel={handleNumberWheel}
                      onChange={e => {
                        setPriceDriver('margin');
                        updateNumericField('margin', e.target.value);
                      }}
                      onBlur={() => setFormData((prev) => syncPriceAndMargin(prev, 'margin'))}
                    />
                  </div>
                  <div>
                    <label className="section-heading">Precio de venta (Final)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input font-bold text-emerald-400"
                      placeholder="0.00"
                      required
                      value={formData.price as any}
                      onWheel={handleNumberWheel}
                      onChange={e => {
                        setPriceDriver('price');
                        updateNumericField('price', e.target.value);
                      }}
                      onBlur={() => setFormData((prev) => syncPriceAndMargin(prev, 'price'))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="section-heading">Descripción</label>
                    <textarea className="input min-h-[60px] py-3" placeholder="Detalles del producto..."
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>

                  <div>
                    <label className="section-heading">Stock inicial</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      required
                      disabled={!isEditing}
                      onWheel={handleNumberWheel}
                      value={
                        isEditing
                          ? (formData.stock as any)
                          : branchAssignments.reduce((acc, item) => acc + toNum(item.initialStock), 0)
                      }
                      onChange={e => setFormData({ ...formData, stock: e.target.value === '' ? '' : Number(e.target.value) } as ProductFormData)}
                    />
                    {!isEditing && (
                      <p className="text-[11px] text-slate-500 mt-1">Se calcula automáticamente según las sucursales asignadas.</p>
                    )}
                  </div>
                  <div>
                    <label className="section-heading">Stock mínimo</label>
                    <input type="number" className="input" placeholder="5" required onWheel={handleNumberWheel}
                      value={formData.minStock as any} onChange={e => setFormData({ ...formData, minStock: e.target.value === '' ? '' : Number(e.target.value) } as ProductFormData)} />
                  </div>

                  {!isEditing && isAdmin && (
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="section-heading !mb-0">Asignación inicial por sucursal</label>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-secondary !py-1 !px-2 text-xs"
                            onClick={() => setBranchAssignments((prev) => [...prev, { branchId: '', initialStock: '' }])}
                          >
                            + Agregar sucursal
                          </button>
                        )}
                      </div>

                      {branchAssignments.length === 0 && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                          Debe asignar al menos una sucursal para crear el producto.
                        </div>
                      )}

                      <div className="space-y-2">
                        {branchAssignments.map((item, idx) => (
                          <div key={`branch-assignment-${idx}`} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-7">
                              <select
                                className="input"
                                value={item.branchId}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setBranchAssignments((prev) =>
                                    prev.map((row, rowIdx) => (rowIdx === idx ? { ...row, branchId: value } : row))
                                  );
                                }}
                                required
                              >
                                <option value="">Seleccionar sucursal...</option>
                                {branches?.map((branch: any) => (
                                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-4">
                              <input
                                type="number"
                                min="0"
                                className="input"
                                placeholder="Stock"
                                onWheel={handleNumberWheel}
                                value={item.initialStock as any}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setBranchAssignments((prev) =>
                                    prev.map((row, rowIdx) => (
                                      rowIdx === idx ? { ...row, initialStock: value === '' ? '' : Number(value) } : row
                                    ))
                                  );
                                }}
                                required
                              />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                className="btn-icon !w-8 !h-8 !text-rose-400 hover:!bg-rose-500/10"
                                title="Quitar"
                                onClick={() => setBranchAssignments((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isEditing && !isAdmin && (
                    <div className="md:col-span-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                      El stock inicial por sucursal lo define un administrador para mantener control centralizado.
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {isEditing ? 'Guardar cambios' : 'Crear producto'}
                  </button>
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary w-full sm:w-auto">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
