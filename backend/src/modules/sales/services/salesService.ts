import mongoose from 'mongoose';
import Sale, { ISale } from '../models/Sale';
import CreditNote from '../models/CreditNote';
import { User } from '../../auth/models/User';
import { adjustStock } from '../../stock/services/stockService';
import { MovementType } from '../../stock/models/StockMovement';
import Product from '../../inventory/models/Product';
import Expense from '../../expenses/models/Expense';
import { buildSaleInvoiceData } from '../../afip/utils/afipInvoiceBuilder';

const generateInternalInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INT-${y}${m}${d}-${h}${min}${s}${ms}-${rand}`;
};

const generateRemitoNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `RMT-${y}${m}${d}-${h}${min}${s}-${rand}`;
};

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

type ParsedDiscount = {
  type: 'NONE' | 'PERCENTAGE' | 'FIXED';
  value: number;
  amount: number;
};

const parseSaleDiscount = (discountInput: any, grossTotal: number): ParsedDiscount => {
  const safeGross = Math.max(0, round2(grossTotal));
  if (!discountInput || safeGross <= 0) {
    return { type: 'NONE', value: 0, amount: 0 };
  }

  const rawType = String(discountInput.type || discountInput.mode || '').toUpperCase();
  const rawValue = Number(discountInput.value);
  const value = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;

  if (value <= 0) {
    return { type: 'NONE', value: 0, amount: 0 };
  }

  if (['PERCENTAGE', 'PERCENT', 'PORCENTAJE'].includes(rawType)) {
    const normalizedPercent = Math.min(100, value);
    const amount = round2((safeGross * normalizedPercent) / 100);
    return {
      type: amount > 0 ? 'PERCENTAGE' : 'NONE',
      value: normalizedPercent,
      amount,
    };
  }

  if (['FIXED', 'AMOUNT', 'MONTO'].includes(rawType)) {
    const amount = round2(Math.min(value, safeGross));
    return {
      type: amount > 0 ? 'FIXED' : 'NONE',
      value,
      amount,
    };
  }

  return { type: 'NONE', value: 0, amount: 0 };
};

const getAfipPointOfSale = () => {
  const raw = Number(process.env.AFIP_PTO_VTA || 1);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 1;
};

const getAfipEnqueueTimeoutMs = () => {
  const raw = Number(process.env.AFIP_ENQUEUE_TIMEOUT_MS || 4000);
  if (!Number.isFinite(raw) || raw <= 0) return 4000;
  return Math.trunc(raw);
};

const enqueueAfipJobWithTimeout = async (afipQueue: any, payload: any) => {
  const timeoutMs = getAfipEnqueueTimeoutMs();

  await Promise.race([
    afipQueue.add('afip-billing', payload),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout al encolar AFIP (${timeoutMs}ms). Verificar REDIS_URL/Redis.`));
      }, timeoutMs);
    }),
  ]);
};

const isFiscalInvoiceType = (invoiceType?: string): boolean => {
  return ['A', 'B', 'C'].includes(String(invoiceType || '').toUpperCase());
};

const mapSaleInvoiceTypeToCreditNoteType = (invoiceType: string): 'NC_A' | 'NC_B' | 'NC_C' => {
  if (invoiceType === 'A') return 'NC_A';
  if (invoiceType === 'B') return 'NC_B';
  if (invoiceType === 'C') return 'NC_C';
  throw new Error('Solo se pueden emitir notas de crédito para facturas A, B o C');
};

const mapCreditNoteTypeToAfipType = (invoiceType: 'NC_A' | 'NC_B' | 'NC_C') => {
  if (invoiceType === 'NC_A') return 3;
  if (invoiceType === 'NC_B') return 8;
  return 13;
};

const mapSaleTypeToAfipType = (invoiceType: 'A' | 'B' | 'C') => {
  if (invoiceType === 'A') return 1;
  if (invoiceType === 'B') return 6;
  return 11;
};

const getSaleCost = (sale: any) => {
  let cost = 0;
  for (const item of sale.items || []) {
    cost += Number(item?.quantity || 0) * Number(item?.costPrice || 0);
  }
  return round2(cost);
};

export const getAllSales = async (filters: any = {}) => {
  return await Sale.find(filters)
    .populate('seller', 'email name')
    .populate('branch', 'name')
    .sort({ createdAt: -1 });
};

export const getCreditNotes = async (filters: any = {}) => {
  return await CreditNote.find(filters)
    .populate('sale', 'invoiceNumber invoiceType total')
    .populate('seller', 'email name')
    .populate('branch', 'name')
    .sort({ createdAt: -1 });
};

export const createCreditNote = async (input: any, userId: string) => {
  const sale = await Sale.findById(input.saleId);
  if (!sale) throw new Error('Venta no encontrada para emitir nota de crédito');

  const useAfipFlow =
    isFiscalInvoiceType(sale.invoiceType) &&
    sale.billingStatus === 'COMPLETED' &&
    Boolean(sale.cae) &&
    Boolean(sale.voucherNumber);

  const mode: 'TOTAL' | 'PARTIAL' = input.mode === 'PARTIAL' ? 'PARTIAL' : 'TOTAL';
  const affectsStock = Boolean(input.affectsStock);
  const reason = (input.reason || 'Anulación de factura').trim();

  if (affectsStock && mode !== 'TOTAL') {
    throw new Error('Por ahora la devolución con impacto de stock requiere nota de crédito total');
  }

  const alreadyCredited = await CreditNote.aggregate([
    {
      $match: {
        sale: sale._id,
        status: 'ACTIVE',
        billingStatus: { $in: ['PENDING', 'COMPLETED'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' },
      },
    },
  ]);

  const alreadyCreditedTotal = Number(alreadyCredited?.[0]?.total || 0);
  const saleTotal = round2(Number(sale.total || 0));
  const availableTotal = round2(saleTotal - alreadyCreditedTotal);

  if (availableTotal <= 0) {
    throw new Error('La factura ya tiene notas de crédito por el total');
  }

  let total = mode === 'PARTIAL' ? round2(Number(input.total || 0)) : availableTotal;
  if (total <= 0) throw new Error('El total de la nota de crédito debe ser mayor a 0');
  if (total > availableTotal) {
    throw new Error(`El total de la nota de crédito supera el disponible (${availableTotal.toFixed(2)})`);
  }

  const ratio = saleTotal > 0 ? total / saleTotal : 0;
  const totalNeto = round2(Number(sale.totalNeto || 0) * ratio);
  const totalIva = round2(Number(sale.totalIva || 0) * ratio);
  total = round2(totalNeto + totalIva);

  const saleCost = getSaleCost(sale);
  const costAmount = affectsStock ? round2(-saleCost * ratio) : 0;

  const invoiceType = useAfipFlow
    ? mapSaleInvoiceTypeToCreditNoteType((sale as any).invoiceType)
    : 'NC_INTERNAL';
  const docTipo = sale.clientCuit ? 80 : 99;
  const docNro = sale.clientCuit ? Number(String(sale.clientCuit).replace(/-/g, '')) : 0;
  const ptoVta = getAfipPointOfSale();

  const itemRatio = ratio;
  const items = (sale.items || []).map((item: any) => ({
    product: item.product,
    name: item.name,
    quantity: mode === 'TOTAL' ? Number(item.quantity || 0) : round2(Number(item.quantity || 0) * itemRatio),
    costPrice: Number(item.costPrice || 0),
    subtotal: round2(Number(item.subtotal || 0) * itemRatio),
  }));

  const creditNote = await CreditNote.create({
    sale: sale._id,
    seller: userId,
    branch: sale.branch,
    items,
    mode,
    reason,
    affectsStock,
    paymentMethod: sale.paymentMethod,
    totalNeto,
    totalIva,
    total,
    costAmount,
    invoiceType,
    associatedInvoiceType: (sale as any).invoiceType || 'NONE',
    associatedInvoiceNumber: sale.invoiceNumber,
    associatedVoucherNumber: useAfipFlow ? sale.voucherNumber : undefined,
    billingStatus: useAfipFlow ? 'PENDING' : 'COMPLETED',
    processedAt: useAfipFlow ? undefined : new Date(),
    status: 'ACTIVE',
  });

  if (!useAfipFlow) {
    if (['REFUNDED', 'CANCELLED'].includes(String((sale as any).status || '').toUpperCase())) {
      throw new Error('La venta ya fue anulada/revertida');
    }

    if (affectsStock) {
      for (const item of (sale as any).items || []) {
        const productId = (item as any).product?._id || (item as any).product || (item as any).productId;
        const quantity = Number((item as any).quantity || 0);

        if (productId && quantity > 0) {
          await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
        }
      }
    }

    (sale as any).status = 'REFUNDED';
    await (sale as any).save();
  } else if (process.env.ENABLE_AFIP_QUEUE === 'true') {
    try {
      const { afipQueue } = await import('../../../config/queues');

      await enqueueAfipJobWithTimeout(afipQueue, {
        entityType: 'credit-note',
        creditNoteId: creditNote._id,
        saleId: sale._id,
        invoiceData: {
          PtoVta: ptoVta,
          CbteTipo: mapCreditNoteTypeToAfipType(invoiceType as 'NC_A' | 'NC_B' | 'NC_C'),
          DocTipo: docTipo,
          DocNro: docNro,
          ImpTotal: total,
          ImpNeto: totalNeto,
          ImpIVA: totalIva,
          IvaDetails: [
            { Id: 5, BaseImp: totalNeto, Importe: totalIva },
          ],
          CbtesAsoc: [
            {
              Tipo: mapSaleTypeToAfipType(sale.invoiceType as 'A' | 'B' | 'C'),
              PtoVta: ptoVta,
              Nro: sale.voucherNumber,
            },
          ],
        },
      });
    } catch (error: any) {
      await CreditNote.findByIdAndUpdate(creditNote._id, {
        billingStatus: 'FAILED',
        errorMessage: `No se pudo encolar AFIP: ${error?.message || error}`,
      });
    }
  } else if (useAfipFlow) {
    await CreditNote.findByIdAndUpdate(creditNote._id, {
      billingStatus: 'FAILED',
      errorMessage: 'Cola AFIP deshabilitada. Habilitar ENABLE_AFIP_QUEUE=true para autorizar la nota de crédito.',
    });
  }

  return await CreditNote.findById(creditNote._id)
    .populate('sale', 'invoiceNumber invoiceType total')
    .populate('seller', 'email name')
    .populate('branch', 'name');
};

export const updateSale = async (id: string, data: any) => {
  const allowed = ['paymentMethod', 'clientName', 'clientCuit', 'clientAddress'];
  const updateData: any = {};

  for (const key of allowed) {
    if (data[key] !== undefined) {
      updateData[key] = data[key];
    }
  }

  return await Sale.findByIdAndUpdate(id, updateData, { new: true })
    .populate('seller', 'email name')
    .populate('branch', 'name');
};

export const deleteSale = async (id: string, userId: string) => {
  const sale = await Sale.findById(id);
  if (!sale) return null;

  for (const item of sale.items || []) {
    await adjustStock({
      productId: String(item.product),
      branchId: String(sale.branch),
      quantity: Number(item.quantity || 0),
      type: MovementType.RETURN,
      userId,
      reference: String(sale._id),
      notes: `Reversión por eliminación de venta ${sale.invoiceNumber || sale._id}`,
    });
  }

  await Sale.findByIdAndDelete(id);
  return sale;
};

export const getProfitReport = async (from?: Date, to?: Date) => {
  const now = new Date();
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const sales = await Sale.find({
    status: 'COMPLETED',
    createdAt: { $gte: start, $lte: end },
  })
    .populate('seller', 'name email roles')
    .populate('branch', 'name')
    .sort({ createdAt: -1 });

  const creditNotes = await CreditNote.find({
    status: 'ACTIVE',
    billingStatus: 'COMPLETED',
    createdAt: { $gte: start, $lte: end },
  })
    .populate({
      path: 'sale',
      select: 'seller sellerCommissionRate branch invoiceType billingStatus',
      populate: [
        { path: 'seller', select: 'name email roles' },
        { path: 'branch', select: 'name' },
      ],
    })
    .populate('branch', 'name')
    .sort({ createdAt: -1 });

  let totalRevenue = 0;
  let totalIva = 0;
  let totalCost = 0;
  let totalNeto = 0;
  let totalDiscount = 0;
  let totalGain = 0;
  let totalCommission = 0;
  let invoicedRevenue = 0;
  let nonInvoicedRevenue = 0;
  let invoicedCount = 0;
  let nonInvoicedCount = 0;
  let pendingFiscalRevenue = 0;
  let failedFiscalRevenue = 0;

  const productCostCache = new Map<string, number>();

  const byPaymentMethod: Record<string, { count: number; revenue: number }> = {};
  const byInvoiceType: Record<string, { count: number; revenue: number }> = {};
  const byDayMap: Record<string, { date: string; sales: number; revenue: number; iva: number; discount: number; cost: number; gain: number }> = {};
  const byBranchMap: Record<string, { branchId: string; branchName: string; sales: number; revenue: number; iva: number; discount: number; cost: number; gain: number }> = {};
  const bySellerMap: Record<string, { sellerId: string; sellerName: string; sales: number; revenue: number; commission: number }> = {};
  const bySellerBranchMap: Record<string, { sellerId: string; sellerName: string; branchId: string; branchName: string; sales: number; revenue: number; commission: number }> = {};

  const resolveBranchMeta = (branch: any) => {
    if (branch && typeof branch === 'object') {
      const branchId = String(branch._id || branch.id || 'sin-sucursal');
      const branchName = String(branch.name || 'Sin sucursal');
      return { branchId, branchName };
    }

    const branchId = branch ? String(branch) : 'sin-sucursal';
    return { branchId, branchName: 'Sin sucursal' };
  };

  const resolveSellerMeta = (seller: any) => {
    if (seller && typeof seller === 'object') {
      const sellerId = String(seller._id || seller.id || 'sin-vendedor');
      const sellerName = String(seller.name || seller.email || 'Sin vendedor');
      return { sellerId, sellerName };
    }

    const sellerId = seller ? String(seller) : 'sin-vendedor';
    return { sellerId, sellerName: 'Sin vendedor' };
  };

  const ensureBranchBucket = (branch: any) => {
    const { branchId, branchName } = resolveBranchMeta(branch);
    const key = `${branchId}::${branchName}`;

    if (!byBranchMap[key]) {
      byBranchMap[key] = {
        branchId,
        branchName,
        sales: 0,
        revenue: 0,
        iva: 0,
        discount: 0,
        cost: 0,
        gain: 0,
      };
    }

    return byBranchMap[key];
  };

  const ensureSellerBucket = (seller: any) => {
    const { sellerId, sellerName } = resolveSellerMeta(seller);
    const key = `${sellerId}::${sellerName}`;

    if (!bySellerMap[key]) {
      bySellerMap[key] = {
        sellerId,
        sellerName,
        sales: 0,
        revenue: 0,
        commission: 0,
      };
    }

    return bySellerMap[key];
  };

  const ensureSellerBranchBucket = (seller: any, branch: any) => {
    const { sellerId, sellerName } = resolveSellerMeta(seller);
    const { branchId, branchName } = resolveBranchMeta(branch);
    const key = `${sellerId}::${sellerName}::${branchId}::${branchName}`;

    if (!bySellerBranchMap[key]) {
      bySellerBranchMap[key] = {
        sellerId,
        sellerName,
        branchId,
        branchName,
        sales: 0,
        revenue: 0,
        commission: 0,
      };
    }

    return bySellerBranchMap[key];
  };

  const isAdminSeller = (seller: any) => {
    const roles = seller && typeof seller === 'object' ? (seller.roles || []) : [];
    return Array.isArray(roles) && roles.includes('admin');
  };

  for (const sale of sales) {
    const isFiscalSale = ['A', 'B', 'C'].includes(String(sale.invoiceType || '').toUpperCase());
    const isSuccessfullyInvoiced = isFiscalSale && sale.billingStatus === 'COMPLETED';
    const revenue = Number(sale.total || 0);
    const iva = isFiscalSale ? Number(sale.totalIva || 0) : 0;
    const neto = Number(sale.totalNeto || 0);
    const discount = Number((sale as any).discountAmount || 0);

    let cost = 0;
    for (const item of sale.items || []) {
      const qty = Number(item?.quantity || 0);
      let c = Number(item?.costPrice || 0);

      if (c <= 0 && item?.product) {
        const productId = String(item.product);

        if (productCostCache.has(productId)) {
          c = productCostCache.get(productId) || 0;
        } else {
          const productDoc = await Product.findById(productId).select('costPrice');
          const fallbackCost = Number(productDoc?.costPrice || 0);
          productCostCache.set(productId, fallbackCost);
          c = fallbackCost;
        }
      }

      cost += qty * c;
    }

    const gain = isFiscalSale
      ? revenue - iva - cost
      : revenue - cost;
    const commissionRate = Number((sale as any).sellerCommissionRate || 0);
    const commission = revenue * (commissionRate / 100);

    totalRevenue += revenue;
    totalIva += iva;
    totalNeto += neto;
    totalDiscount += discount;
    totalCost += cost;
    totalGain += gain;

    if (isSuccessfullyInvoiced) {
      invoicedRevenue += revenue;
      invoicedCount += 1;
    } else {
      nonInvoicedRevenue += revenue;
      nonInvoicedCount += 1;

      if (isFiscalSale && sale.billingStatus === 'PENDING') {
        pendingFiscalRevenue += revenue;
      }

      if (isFiscalSale && sale.billingStatus === 'FAILED') {
        failedFiscalRevenue += revenue;
      }
    }

    if (!isAdminSeller((sale as any).seller)) {
      totalCommission += commission;
    }

    const paymentMethod = sale.paymentMethod || 'otro';
    if (!byPaymentMethod[paymentMethod]) {
      byPaymentMethod[paymentMethod] = { count: 0, revenue: 0 };
    }
    byPaymentMethod[paymentMethod].count += 1;
    byPaymentMethod[paymentMethod].revenue += revenue;

    const invoiceType = sale.invoiceType || 'NONE';
    if (!byInvoiceType[invoiceType]) {
      byInvoiceType[invoiceType] = { count: 0, revenue: 0 };
    }
    byInvoiceType[invoiceType].count += 1;
    byInvoiceType[invoiceType].revenue += revenue;

    const dayKey = new Date(sale.createdAt).toISOString().split('T')[0];
    if (!byDayMap[dayKey]) {
      byDayMap[dayKey] = { date: dayKey, sales: 0, revenue: 0, iva: 0, discount: 0, cost: 0, gain: 0 };
    }
    byDayMap[dayKey].sales += 1;
    byDayMap[dayKey].revenue += revenue;
    byDayMap[dayKey].iva += iva;
    byDayMap[dayKey].discount += discount;
    byDayMap[dayKey].cost += cost;
    byDayMap[dayKey].gain += gain;

    const branchBucket = ensureBranchBucket((sale as any).branch);
    branchBucket.sales += 1;
    branchBucket.revenue += revenue;
    branchBucket.iva += iva;
    branchBucket.discount += discount;
    branchBucket.cost += cost;
    branchBucket.gain += gain;

    if (!isAdminSeller((sale as any).seller)) {
      const sellerBucket = ensureSellerBucket((sale as any).seller);
      sellerBucket.sales += 1;
      sellerBucket.revenue += revenue;
      sellerBucket.commission += commission;

      const sellerBranchBucket = ensureSellerBranchBucket((sale as any).seller, (sale as any).branch);
      sellerBranchBucket.sales += 1;
      sellerBranchBucket.revenue += revenue;
      sellerBranchBucket.commission += commission;
    }
  }

  const expenses = await Expense.find({
    isActive: true,
    date: { $gte: start, $lte: end },
  }).sort({ date: -1, createdAt: -1 });

  const totalExpenses = expenses.reduce((acc, e: any) => acc + Number(e.amount || 0), 0);
  const totalExpensesAffectingProfit = expenses
    .filter((e: any) => Boolean(e.affectsProfit))
    .reduce((acc, e: any) => acc + Number(e.amount || 0), 0);
  const totalExpensesInformative = totalExpenses - totalExpensesAffectingProfit;

  for (const note of creditNotes) {
    const revenue = Number(note.total || 0);
    const iva = Number(note.totalIva || 0);
    const neto = Number(note.totalNeto || 0);
    const cost = Number(note.costAmount || 0);
    const gain = neto + cost;
    const originalSale = (note as any).sale;
    const originalIsFiscal = ['A', 'B', 'C'].includes(String(originalSale?.invoiceType || '').toUpperCase());
    const originalIsSuccessfullyInvoiced = originalIsFiscal && originalSale?.billingStatus === 'COMPLETED';
    const noteCommissionRate = Number(originalSale?.sellerCommissionRate || 0);
    const noteCommission = revenue * (noteCommissionRate / 100);

    totalRevenue -= revenue;
    totalIva -= iva;
    totalNeto -= neto;
    totalCost += cost;
    totalGain -= gain;

    if (originalIsSuccessfullyInvoiced) {
      invoicedRevenue -= revenue;
    } else {
      nonInvoicedRevenue -= revenue;
      if (originalIsFiscal && originalSale?.billingStatus === 'PENDING') {
        pendingFiscalRevenue -= revenue;
      }
      if (originalIsFiscal && originalSale?.billingStatus === 'FAILED') {
        failedFiscalRevenue -= revenue;
      }
    }

    if (!isAdminSeller(originalSale?.seller)) {
      totalCommission -= noteCommission;
    }

    const paymentMethod = note.paymentMethod || 'otro';
    if (!byPaymentMethod[paymentMethod]) {
      byPaymentMethod[paymentMethod] = { count: 0, revenue: 0 };
    }
    byPaymentMethod[paymentMethod].count += 1;
    byPaymentMethod[paymentMethod].revenue -= revenue;

    const dayKey = new Date(note.createdAt).toISOString().split('T')[0];
    if (!byDayMap[dayKey]) {
      byDayMap[dayKey] = { date: dayKey, sales: 0, revenue: 0, iva: 0, discount: 0, cost: 0, gain: 0 };
    }
    byDayMap[dayKey].sales += 1;
    byDayMap[dayKey].revenue -= revenue;
    byDayMap[dayKey].iva -= iva;
    byDayMap[dayKey].cost += cost;
    byDayMap[dayKey].gain -= gain;

    const branchBucket = ensureBranchBucket((note as any).branch);
    branchBucket.revenue -= revenue;
    branchBucket.iva -= iva;
    branchBucket.cost += cost;
    branchBucket.gain -= gain;

    if (!isAdminSeller(originalSale?.seller)) {
      const sellerBucket = ensureSellerBucket(originalSale?.seller);
      sellerBucket.revenue -= revenue;
      sellerBucket.commission -= noteCommission;

      const sellerBranchBucket = ensureSellerBranchBucket(originalSale?.seller, originalSale?.branch || (note as any).branch);
      sellerBranchBucket.revenue -= revenue;
      sellerBranchBucket.commission -= noteCommission;
    }
  }

  const gainAfterExpenses = totalGain - totalExpensesAffectingProfit;

  const gainWithoutIva = totalGain;
  const marginPercent = totalRevenue > 0 ? (totalGain / totalRevenue) * 100 : 0;

  const byDay = Object.values(byDayMap).sort((a, b) => b.date.localeCompare(a.date));
  const byBranch = Object.values(byBranchMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((row) => ({
      ...row,
      revenue: Number(row.revenue.toFixed(2)),
      iva: Number(row.iva.toFixed(2)),
      discount: Number(row.discount.toFixed(2)),
      cost: Number(row.cost.toFixed(2)),
      gain: Number(row.gain.toFixed(2)),
    }));

  const bySeller = Object.values(bySellerMap)
    .sort((a, b) => b.commission - a.commission)
    .map((row) => ({
      ...row,
      effectiveRate: row.revenue !== 0 ? (row.commission / row.revenue) * 100 : 0,
    }));

  const bySellerBranch = Object.values(bySellerBranchMap)
    .sort((a, b) => b.commission - a.commission)
    .map((row) => ({
      ...row,
      effectiveRate: row.revenue !== 0 ? (row.commission / row.revenue) * 100 : 0,
    }));

  return {
    range: {
      from: start,
      to: end,
    },
    summary: {
      salesCount: sales.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalInvoicedRevenue: Number(invoicedRevenue.toFixed(2)),
      totalNonInvoicedRevenue: Number(nonInvoicedRevenue.toFixed(2)),
      invoicedSalesCount: invoicedCount,
      nonInvoicedSalesCount: nonInvoicedCount,
      pendingFiscalRevenue: Number(pendingFiscalRevenue.toFixed(2)),
      failedFiscalRevenue: Number(failedFiscalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalIva: Number(totalIva.toFixed(2)),
      totalNeto: Number(totalNeto.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalExpensesAffectingProfit: Number(totalExpensesAffectingProfit.toFixed(2)),
      totalExpensesInformative: Number(totalExpensesInformative.toFixed(2)),
      totalGain: Number(totalGain.toFixed(2)),
      gainAfterExpenses: Number(gainAfterExpenses.toFixed(2)),
      totalCommission,
      gainWithoutIva: Number(gainWithoutIva.toFixed(2)),
      marginPercent: Number(marginPercent.toFixed(2)),
    },
    byPaymentMethod: Object.entries(byPaymentMethod).map(([method, val]) => ({
      method,
      count: val.count,
      revenue: Number(val.revenue.toFixed(2)),
    })),
    byInvoiceType: Object.entries(byInvoiceType).map(([invoiceType, val]) => ({
      invoiceType,
      count: val.count,
      revenue: Number(val.revenue.toFixed(2)),
    })),
    byBranch,
    bySeller,
    bySellerBranch,
    byDay: byDay.map((d) => ({
      ...d,
      revenue: Number(d.revenue.toFixed(2)),
      iva: Number(d.iva.toFixed(2)),
      discount: Number(d.discount.toFixed(2)),
      cost: Number(d.cost.toFixed(2)),
      gain: Number(d.gain.toFixed(2)),
    })),
  };
};

export const createSale = async (saleData: any, sellerId: string, requesterRoles: string[] = []) => {
  const runCreateSale = async (useTransaction: boolean) => {
    const session = useTransaction ? await mongoose.startSession() : null;

    if (session) {
      session.startTransaction();
    }

    try {
    const invoiceType = saleData.invoiceType || 'NONE';
    const isFiscalSale = invoiceType !== 'NONE';
    const requiresAfip = invoiceType === 'A' || invoiceType === 'B' || invoiceType === 'C';

    let totalNeto = 0;
    let totalIva = 0;
    const processedItems = [];

    const seller = session
      ? await User.findById(sellerId).session(session)
      : await User.findById(sellerId);
    if (!seller) throw new Error('Vendedor no encontrado');

    const isAdminRequester = requesterRoles.includes('admin');
    let branchId: any;

    if (isAdminRequester) {
      branchId = saleData.branchId || seller.branch;
      if (!branchId) throw new Error('Se requiere una sucursal para la venta.');
    } else {
      if (!seller.branch) {
        throw new Error('No tenés sucursal asignada. Solicitá al administrador que te asigne una sucursal.');
      }

      if (saleData.branchId && String(saleData.branchId) !== String(seller.branch)) {
        throw new Error('No podés registrar ventas en una sucursal distinta a la asignada.');
      }

      branchId = seller.branch;
    }

    for (const item of saleData.items) {
      const productId = item.id || item.product;

      const productDoc = session
        ? await Product.findById(productId).session(session)
        : await Product.findById(productId);

      if (!productDoc) {
        throw new Error(`Producto no encontrado para la venta: ${productId}`);
      }

      const itemPrice = Number(item.price || productDoc.price || 0);
      const itemCostPrice = Number(item.costPrice || productDoc.costPrice || 0);

      // Usar servicio de stock que maneja movimientos y sucursales
      await adjustStock({
        productId,
        branchId: branchId.toString(),
        quantity: item.quantity,
        type: MovementType.SALE,
        userId: sellerId,
        notes: `Venta directa`
      });

      const ivaRate = item.ivaRate ?? 21;
      const ivaFactor = 1 + (ivaRate / 100);
      const unitNeto = isFiscalSale ? itemPrice / ivaFactor : itemPrice;
      const unitIva = isFiscalSale ? itemPrice - unitNeto : 0;

      processedItems.push({
        product: productId,
        name: item.name,
        quantity: item.quantity,
        price: itemPrice,
        costPrice: itemCostPrice,
        ivaRate,
        subtotal: itemPrice * item.quantity
      });

      totalNeto += unitNeto * item.quantity;
      totalIva += unitIva * item.quantity;
    }

    const grossTotal = round2(totalNeto + totalIva);
    const parsedDiscount = parseSaleDiscount(saleData.discount, grossTotal);

    let finalTotalNeto = round2(totalNeto);
    let finalTotalIva = round2(totalIva);
    let finalTotal = grossTotal;

    if (parsedDiscount.amount > 0) {
      finalTotal = round2(Math.max(0, grossTotal - parsedDiscount.amount));

      if (isFiscalSale) {
        const ratio = grossTotal > 0 ? finalTotal / grossTotal : 1;
        finalTotalNeto = round2(totalNeto * ratio);
        finalTotalIva = round2(finalTotal - finalTotalNeto);
      } else {
        finalTotalNeto = finalTotal;
        finalTotalIva = 0;
      }
    }

    const newSale = new Sale({
      items: processedItems,
      totalNeto: finalTotalNeto,
      totalIva: finalTotalIva,
      total: finalTotal,
      discountType: parsedDiscount.type,
      discountValue: parsedDiscount.value,
      discountAmount: parsedDiscount.amount,
      paymentMethod: saleData.paymentMethod || 'efectivo',
      source: saleData.source || 'POS',
      invoiceType,
      invoiceNumber: saleData.invoiceNumber || generateInternalInvoiceNumber(),
      remitoNumber: saleData.remitoNumber || generateRemitoNumber(),
      clientName: saleData.clientName,
      clientCuit: saleData.clientCuit,
      clientAddress: saleData.clientAddress,
      clientFiscalCondition: saleData.clientFiscalCondition,
      seller: sellerId,
      sellerCommissionRate: seller.commissionRate || 0,
      branch: branchId,
      status: 'COMPLETED',
      billingStatus: requiresAfip ? 'NOT_INVOICED' : 'NONE',
      shippingAddress: saleData.shippingAddress,
      shippingMethod: saleData.shippingMethod,
      shippingCost: saleData.shippingCost,
      paymentId: saleData.paymentId,
      paymentStatus: saleData.paymentStatus,
    });

    if (session) {
      await newSale.save({ session });
      await session.commitTransaction();
    } else {
      await newSale.save();
    }

    return newSale;
    } catch (error: any) {
      if (session?.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session?.endSession();
    }
  };

  try {
    return await runCreateSale(true);
  } catch (error: any) {
    const message = error?.message || '';
    const transactionNotSupported =
      message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
      message.includes('Transaction numbers');

    if (transactionNotSupported) {
      return await runCreateSale(false);
    }

    throw error;
  }
};

export const getSaleById = async (id: string) => {
  return await Sale.findById(id)
    .populate('seller', 'email')
    .populate('branch', 'name address')
    .populate('items.product', 'name');
};

export const invoiceSale = async (saleId: string) => {
  const sale = await Sale.findById(saleId);
  if (!sale) throw new Error('Venta no encontrada');

  const invoiceType = String(sale.invoiceType || 'NONE').toUpperCase();
  if (!['A', 'B', 'C'].includes(invoiceType)) {
    throw new Error('La venta no requiere factura fiscal AFIP');
  }

  if (sale.billingStatus === 'COMPLETED') {
    throw new Error('La venta ya fue facturada');
  }

  if (sale.billingStatus === 'PENDING') {
    throw new Error('La venta ya tiene una facturación en proceso');
  }

  const ptoVta = getAfipPointOfSale();
  const invoiceData = buildSaleInvoiceData(sale, ptoVta);

  await Sale.findByIdAndUpdate(saleId, {
    billingStatus: 'PENDING',
    errorMessage: null,
  });

  if (process.env.ENABLE_AFIP_QUEUE === 'true') {
    try {
      const { afipQueue } = await import('../../../config/queues');
      await enqueueAfipJobWithTimeout(afipQueue, {
        saleId,
        invoiceData,
      });
    } catch (error: any) {
      await Sale.findByIdAndUpdate(saleId, {
        billingStatus: 'FAILED',
        errorMessage: `No se pudo encolar AFIP: ${error?.message || error}`,
      });
      throw error;
    }
  } else {
    await Sale.findByIdAndUpdate(saleId, {
      billingStatus: 'FAILED',
      errorMessage: 'Cola AFIP deshabilitada. Habilitar ENABLE_AFIP_QUEUE=true para autorizar la factura.',
    });
    throw new Error('Cola AFIP deshabilitada. Habilitar ENABLE_AFIP_QUEUE=true para autorizar la factura.');
  }

  return await Sale.findById(saleId)
    .populate('seller', 'email name')
    .populate('branch', 'name address');
};
