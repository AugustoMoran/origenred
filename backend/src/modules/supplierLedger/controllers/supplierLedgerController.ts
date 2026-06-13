import { Request, Response } from 'express';
import Supplier from '../../suppliers/models/Supplier';
import SupplierLedgerEntry from '../models/SupplierLedgerEntry';

const parseDateParam = (value: unknown, endOfDay = false): Date | undefined => {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;

  const onlyDate = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = raw.match(onlyDate);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return endOfDay
      ? new Date(year, month, day, 23, 59, 59, 999)
      : new Date(year, month, day, 0, 0, 0, 0);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
};

const normalizeText = (value: unknown) => String(value || '').trim();

const computeSignedAmount = (
  entryType: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT',
  amount: number,
  adjustmentSign?: 'DEBIT' | 'CREDIT'
) => {
  if (entryType === 'INVOICE') return amount;
  if (entryType === 'PAYMENT') return -amount;

  if (adjustmentSign === 'CREDIT') return -amount;
  return amount;
};

export const getLedgerEntriesController = async (req: Request, res: Response) => {
  try {
    const from = parseDateParam(req.query.from, false);
    const to = parseDateParam(req.query.to, true);

    if (req.query.from && !from) return res.status(400).json({ message: 'Fecha "from" inválida' });
    if (req.query.to && !to) return res.status(400).json({ message: 'Fecha "to" inválida' });

    const filters: any = { isActive: true };

    if (from || to) {
      filters.date = {};
      if (from) filters.date.$gte = from;
      if (to) filters.date.$lte = to;
    }

    if (req.query.supplierId) {
      filters.supplier = req.query.supplierId;
    }

    if (req.query.entryType) {
      filters.entryType = String(req.query.entryType).toUpperCase();
    }

    const q = normalizeText(req.query.q);
    if (q) {
      filters.$or = [
        { reference: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { counterpartyName: { $regex: q, $options: 'i' } },
      ];
    }

    const entries = await SupplierLedgerEntry.find(filters)
      .populate('supplier', 'name')
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    const totalInvoices = entries
      .filter((e: any) => e.entryType === 'INVOICE')
      .reduce((acc, e: any) => acc + Number(e.amount || 0), 0);

    const totalPayments = entries
      .filter((e: any) => e.entryType === 'PAYMENT')
      .reduce((acc, e: any) => acc + Number(e.amount || 0), 0);

    const netBalance = entries.reduce((acc, e: any) => acc + Number(e.signedAmount || 0), 0);

    res.json({
      items: entries,
      summary: {
        count: entries.length,
        totalInvoices: Number(totalInvoices.toFixed(2)),
        totalPayments: Number(totalPayments.toFixed(2)),
        netBalance: Number(netBalance.toFixed(2)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBalanceBySupplierController = async (_req: Request, res: Response) => {
  try {
    const balances = await SupplierLedgerEntry.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: {
            supplier: '$supplier',
            counterpartyName: '$counterpartyName',
          },
          balance: { $sum: '$signedAmount' },
          invoices: {
            $sum: {
              $cond: [{ $eq: ['$entryType', 'INVOICE'] }, '$amount', 0],
            },
          },
          payments: {
            $sum: {
              $cond: [{ $eq: ['$entryType', 'PAYMENT'] }, '$amount', 0],
            },
          },
          lastMovementDate: { $max: '$date' },
          movementCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id.supplier',
          foreignField: '_id',
          as: 'supplierDoc',
        },
      },
      {
        $addFields: {
          supplierName: {
            $ifNull: [
              { $arrayElemAt: ['$supplierDoc.name', 0] },
              { $ifNull: ['$_id.counterpartyName', 'Otro'] },
            ],
          },
          supplierId: '$_id.supplier',
        },
      },
      {
        $project: {
          _id: 0,
          supplierId: 1,
          supplierName: 1,
          balance: { $round: ['$balance', 2] },
          invoices: { $round: ['$invoices', 2] },
          payments: { $round: ['$payments', 2] },
          lastMovementDate: 1,
          movementCount: 1,
        },
      },
      { $sort: { balance: -1, supplierName: 1 } },
    ]);

    const totals = balances.reduce(
      (acc: any, row: any) => {
        acc.totalDebt += Number(row.balance || 0);
        acc.totalInvoiced += Number(row.invoices || 0);
        acc.totalPaid += Number(row.payments || 0);
        return acc;
      },
      { totalDebt: 0, totalInvoiced: 0, totalPaid: 0 }
    );

    res.json({
      items: balances,
      summary: {
        totalCounterparties: balances.length,
        totalDebt: Number(totals.totalDebt.toFixed(2)),
        totalInvoiced: Number(totals.totalInvoiced.toFixed(2)),
        totalPaid: Number(totals.totalPaid.toFixed(2)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createLedgerEntryController = async (req: Request, res: Response) => {
  try {
    const date = parseDateParam(req.body?.date, false);
    const supplierId = req.body?.supplierId || undefined;
    const counterpartyName = normalizeText(req.body?.counterpartyName);
    const reference = normalizeText(req.body?.reference);
    const description = normalizeText(req.body?.description);
    const entryType = String(req.body?.entryType || '').toUpperCase() as 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT';
    const adjustmentSign = String(req.body?.adjustmentSign || 'DEBIT').toUpperCase() as 'DEBIT' | 'CREDIT';
    const amount = Number(req.body?.amount || 0);

    if (!date) return res.status(400).json({ message: 'La fecha es obligatoria y válida' });
    if (!['INVOICE', 'PAYMENT', 'ADJUSTMENT'].includes(entryType)) {
      return res.status(400).json({ message: 'Tipo de movimiento inválido' });
    }
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });

    if (supplierId) {
      const supplierExists = await Supplier.findById(supplierId).select('_id isActive');
      if (!supplierExists || !supplierExists.isActive) {
        return res.status(400).json({ message: 'Proveedor no válido' });
      }
    }

    if (!supplierId && !counterpartyName) {
      return res.status(400).json({ message: 'Debe indicar proveedor o nombre de contraparte' });
    }

    const signedAmount = computeSignedAmount(entryType, amount, adjustmentSign);

    const entry = await SupplierLedgerEntry.create({
      date,
      supplier: supplierId,
      counterpartyName: supplierId ? undefined : counterpartyName,
      reference: reference || undefined,
      description: description || undefined,
      entryType,
      amount,
      signedAmount,
      createdBy: (req as any)?.user?._id,
      isActive: true,
    });

    const populated = await SupplierLedgerEntry.findById(entry._id)
      .populate('supplier', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateLedgerEntryController = async (req: Request, res: Response) => {
  try {
    const current = await SupplierLedgerEntry.findOne({ _id: req.params.id, isActive: true });
    if (!current) return res.status(404).json({ message: 'Movimiento no encontrado' });

    const payload: any = {};

    const nextEntryType = req.body?.entryType
      ? String(req.body?.entryType).toUpperCase()
      : String(current.entryType);

    if (!['INVOICE', 'PAYMENT', 'ADJUSTMENT'].includes(nextEntryType)) {
      return res.status(400).json({ message: 'Tipo de movimiento inválido' });
    }

    if (req.body?.date !== undefined) {
      const date = parseDateParam(req.body?.date, false);
      if (!date) return res.status(400).json({ message: 'La fecha es inválida' });
      payload.date = date;
    }

    let nextSupplierId = current.supplier;
    if (req.body?.supplierId !== undefined) {
      nextSupplierId = req.body?.supplierId || undefined;
      if (nextSupplierId) {
        const supplierExists = await Supplier.findById(nextSupplierId).select('_id isActive');
        if (!supplierExists || !supplierExists.isActive) {
          return res.status(400).json({ message: 'Proveedor no válido' });
        }
      }
      payload.supplier = nextSupplierId;
    }

    const nextCounterpartyName = req.body?.counterpartyName !== undefined
      ? normalizeText(req.body?.counterpartyName)
      : String(current.counterpartyName || '').trim();

    if (!nextSupplierId && !nextCounterpartyName) {
      return res.status(400).json({ message: 'Debe indicar proveedor o nombre de contraparte' });
    }

    if (req.body?.counterpartyName !== undefined || req.body?.supplierId !== undefined) {
      payload.counterpartyName = nextSupplierId ? undefined : nextCounterpartyName;
    }

    if (req.body?.reference !== undefined) {
      payload.reference = normalizeText(req.body?.reference) || undefined;
    }

    if (req.body?.description !== undefined) {
      payload.description = normalizeText(req.body?.description) || undefined;
    }

    if (req.body?.entryType !== undefined) {
      payload.entryType = nextEntryType;
    }

    const nextAmount = req.body?.amount !== undefined ? Number(req.body?.amount) : Number(current.amount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }
    if (req.body?.amount !== undefined) {
      payload.amount = nextAmount;
    }

    const adjustmentSign = String(req.body?.adjustmentSign || 'DEBIT').toUpperCase() as 'DEBIT' | 'CREDIT';

    payload.signedAmount = computeSignedAmount(nextEntryType as any, nextAmount, adjustmentSign);

    const updated = await SupplierLedgerEntry.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true }
    )
      .populate('supplier', 'name')
      .populate('createdBy', 'name email');

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteLedgerEntryController = async (req: Request, res: Response) => {
  try {
    const entry = await SupplierLedgerEntry.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!entry) return res.status(404).json({ message: 'Movimiento no encontrado' });

    res.json({ message: 'Movimiento eliminado' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
