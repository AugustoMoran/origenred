import mongoose from 'mongoose';
import Sale, { ISale } from '../models/Sale';
import CreditNote from '../models/CreditNote';
import { User } from '../../auth/models/User';
import { adjustStock } from '../../stock/services/stockService';
import { MovementType } from '../../stock/models/StockMovement';
import Product from '../../inventory/models/Product';

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

const getAfipPointOfSale = () => {
  const raw = Number(process.env.AFIP_PTO_VTA || 1);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 1;
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

  if (!['A', 'B', 'C'].includes(sale.invoiceType)) {
    throw new Error('La venta debe ser fiscal (Factura A/B/C) para emitir nota de crédito AFIP');
  }

  if (sale.billingStatus !== 'COMPLETED' || !sale.cae) {
    throw new Error('La factura original no está autorizada por AFIP');
  }

  if (!sale.voucherNumber) {
    throw new Error('La factura original no tiene número de comprobante AFIP asociado');
  }

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

  const invoiceType = mapSaleInvoiceTypeToCreditNoteType(sale.invoiceType);
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
    associatedInvoiceType: sale.invoiceType,
    associatedInvoiceNumber: sale.invoiceNumber,
    associatedVoucherNumber: sale.voucherNumber,
    billingStatus: 'PENDING',
    status: 'ACTIVE',
  });

  if (process.env.ENABLE_AFIP_QUEUE === 'true') {
    try {
      const { afipQueue } = await import('../../../config/queues');

      await afipQueue.add('afip-billing', {
        entityType: 'credit-note',
        creditNoteId: creditNote._id,
        saleId: sale._id,
        invoiceData: {
          PtoVta: ptoVta,
          CbteTipo: mapCreditNoteTypeToAfipType(invoiceType),
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
  } else {
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
    .populate('branch', 'name')
    .sort({ createdAt: -1 });

  const creditNotes = await CreditNote.find({
    status: 'ACTIVE',
    billingStatus: 'COMPLETED',
    createdAt: { $gte: start, $lte: end },
  }).sort({ createdAt: -1 });

  let totalRevenue = 0;
  let totalIva = 0;
  let totalCost = 0;
  let totalNeto = 0;
  let totalGain = 0;

  const productCostCache = new Map<string, number>();

  const byPaymentMethod: Record<string, { count: number; revenue: number }> = {};
  const byInvoiceType: Record<string, { count: number; revenue: number }> = {};
  const byDayMap: Record<string, { date: string; sales: number; revenue: number; iva: number; cost: number; gain: number }> = {};

  for (const sale of sales) {
    const isFiscalSale = sale.invoiceType !== 'NONE';
    const revenue = Number(sale.total || 0);
    const iva = isFiscalSale ? Number(sale.totalIva || 0) : 0;
    const neto = Number(sale.totalNeto || 0);

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

    totalRevenue += revenue;
    totalIva += iva;
    totalNeto += neto;
    totalCost += cost;
    totalGain += gain;

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
      byDayMap[dayKey] = { date: dayKey, sales: 0, revenue: 0, iva: 0, cost: 0, gain: 0 };
    }
    byDayMap[dayKey].sales += 1;
    byDayMap[dayKey].revenue += revenue;
    byDayMap[dayKey].iva += iva;
    byDayMap[dayKey].cost += cost;
    byDayMap[dayKey].gain += gain;
  }

  for (const note of creditNotes) {
    const revenue = Number(note.total || 0);
    const iva = Number(note.totalIva || 0);
    const neto = Number(note.totalNeto || 0);
    const cost = Number(note.costAmount || 0);
    const gain = neto + cost;

    totalRevenue -= revenue;
    totalIva -= iva;
    totalNeto -= neto;
    totalCost += cost;
    totalGain -= gain;

    const paymentMethod = note.paymentMethod || 'otro';
    if (!byPaymentMethod[paymentMethod]) {
      byPaymentMethod[paymentMethod] = { count: 0, revenue: 0 };
    }
    byPaymentMethod[paymentMethod].count += 1;
    byPaymentMethod[paymentMethod].revenue -= revenue;

    const dayKey = new Date(note.createdAt).toISOString().split('T')[0];
    if (!byDayMap[dayKey]) {
      byDayMap[dayKey] = { date: dayKey, sales: 0, revenue: 0, iva: 0, cost: 0, gain: 0 };
    }
    byDayMap[dayKey].sales += 1;
    byDayMap[dayKey].revenue -= revenue;
    byDayMap[dayKey].iva -= iva;
    byDayMap[dayKey].cost += cost;
    byDayMap[dayKey].gain -= gain;
  }

  const gainWithoutIva = totalGain;
  const marginPercent = totalRevenue > 0 ? (totalGain / totalRevenue) * 100 : 0;

  const byDay = Object.values(byDayMap).sort((a, b) => b.date.localeCompare(a.date));

  return {
    range: {
      from: start,
      to: end,
    },
    summary: {
      salesCount: sales.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalIva: Number(totalIva.toFixed(2)),
      totalNeto: Number(totalNeto.toFixed(2)),
      totalGain: Number(totalGain.toFixed(2)),
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
    byDay: byDay.map((d) => ({
      ...d,
      revenue: Number(d.revenue.toFixed(2)),
      iva: Number(d.iva.toFixed(2)),
      cost: Number(d.cost.toFixed(2)),
      gain: Number(d.gain.toFixed(2)),
    })),
  };
};

export const createSale = async (saleData: any, sellerId: string) => {
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

    const branchId = saleData.branchId || seller.branch;
    if (!branchId) throw new Error('Se requiere una sucursal para la venta.');

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

    const newSale = new Sale({
      items: processedItems,
      totalNeto: Math.round(totalNeto * 100) / 100,
      totalIva: Math.round(totalIva * 100) / 100,
      total: Math.round((totalNeto + totalIva) * 100) / 100,
      paymentMethod: saleData.paymentMethod || 'efectivo',
      invoiceType,
      invoiceNumber: saleData.invoiceNumber || generateInternalInvoiceNumber(),
      remitoNumber: saleData.remitoNumber || generateRemitoNumber(),
      clientName: saleData.clientName,
      clientCuit: saleData.clientCuit,
      clientAddress: saleData.clientAddress,
      seller: sellerId,
      sellerCommissionRate: seller.commissionRate || 0,
      branch: branchId,
      status: 'COMPLETED',
      billingStatus: requiresAfip ? 'PENDING' : 'NONE'
    });

    if (session) {
      await newSale.save({ session });
      await session.commitTransaction();
    } else {
      await newSale.save();
    }

    // 4. Si requiere factura AFIP, enviar a la cola (solo si está habilitada)
    if (process.env.ENABLE_AFIP_QUEUE === 'true' && requiresAfip) {
      const ptoVta = getAfipPointOfSale();
      const tipoComprobante = newSale.invoiceType === 'A' ? 1 : 6;
      const docTipo = newSale.clientCuit ? 80 : 99;
      const docNro = newSale.clientCuit ? Number(newSale.clientCuit.replace(/-/g, '')) : 0;

      try {
        const { afipQueue } = await import('../../../config/queues');

        await afipQueue.add('afip-billing', {
          saleId: newSale._id,
          invoiceData: {
            PtoVta: ptoVta,
            CbteTipo: tipoComprobante,
            DocTipo: docTipo,
            DocNro: docNro,
            ImpTotal: newSale.total,
            ImpNeto: newSale.totalNeto,
            ImpIVA: newSale.totalIva,
            IvaDetails: [
              { Id: 5, BaseImp: newSale.totalNeto, Importe: newSale.totalIva }
            ]
          }
        });
      } catch (error: any) {
        await Sale.findByIdAndUpdate(newSale._id, {
          billingStatus: 'FAILED',
          errorMessage: `No se pudo encolar AFIP: ${error?.message || error}`,
        });
      }
    } else if (requiresAfip) {
      await Sale.findByIdAndUpdate(newSale._id, {
        billingStatus: 'FAILED',
        errorMessage: 'Cola AFIP deshabilitada. Habilitar ENABLE_AFIP_QUEUE=true para autorizar la factura.',
      });
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
    .populate('branch', 'name')
    .populate('items.product', 'name');
};
