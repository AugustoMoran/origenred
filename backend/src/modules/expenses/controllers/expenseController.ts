import { Request, Response } from 'express';
import Expense from '../models/Expense';

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

export const getExpensesController = async (req: Request, res: Response) => {
  try {
    const from = parseDateParam(req.query.from, false);
    const to = parseDateParam(req.query.to, true);

    if (req.query.from && !from) {
      return res.status(400).json({ message: 'Fecha "from" inválida' });
    }

    if (req.query.to && !to) {
      return res.status(400).json({ message: 'Fecha "to" inválida' });
    }

    const filters: any = { isActive: true };
    if (from || to) {
      filters.date = {};
      if (from) filters.date.$gte = from;
      if (to) filters.date.$lte = to;
    }

    if (typeof req.query.affectsProfit === 'string') {
      if (req.query.affectsProfit === 'true') filters.affectsProfit = true;
      if (req.query.affectsProfit === 'false') filters.affectsProfit = false;
    }

    const expenses = await Expense.find(filters)
      .populate('branch', 'name')
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    const totalAmount = expenses.reduce((acc, e: any) => acc + Number(e.amount || 0), 0);
    const totalAffectingProfit = expenses
      .filter((e: any) => Boolean(e.affectsProfit))
      .reduce((acc, e: any) => acc + Number(e.amount || 0), 0);

    const totalInformative = totalAmount - totalAffectingProfit;

    res.json({
      items: expenses,
      summary: {
        count: expenses.length,
        totalAmount: Number(totalAmount.toFixed(2)),
        totalAffectingProfit: Number(totalAffectingProfit.toFixed(2)),
        totalInformative: Number(totalInformative.toFixed(2)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createExpenseController = async (req: Request, res: Response) => {
  try {
    const date = parseDateParam(req.body?.date, false);
    const description = normalizeText(req.body?.description);
    const amount = Number(req.body?.amount || 0);

    if (!date) return res.status(400).json({ message: 'La fecha es obligatoria y válida' });
    if (!description) return res.status(400).json({ message: 'La descripción es obligatoria' });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });

    const expense = await Expense.create({
      date,
      description,
      amount,
      affectsProfit: Boolean(req.body?.affectsProfit),
      category: normalizeText(req.body?.category) || undefined,
      branch: req.body?.branchId || undefined,
      createdBy: (req as any)?.user?._id,
      isActive: true,
    });

    const populated = await Expense.findById(expense._id)
      .populate('branch', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateExpenseController = async (req: Request, res: Response) => {
  try {
    const payload: any = {};

    if (req.body?.date !== undefined) {
      const date = parseDateParam(req.body?.date, false);
      if (!date) return res.status(400).json({ message: 'La fecha es inválida' });
      payload.date = date;
    }

    if (req.body?.description !== undefined) {
      const description = normalizeText(req.body?.description);
      if (!description) return res.status(400).json({ message: 'La descripción no puede estar vacía' });
      payload.description = description;
    }

    if (req.body?.amount !== undefined) {
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
      payload.amount = amount;
    }

    if (req.body?.affectsProfit !== undefined) {
      payload.affectsProfit = Boolean(req.body?.affectsProfit);
    }

    if (req.body?.category !== undefined) {
      payload.category = normalizeText(req.body?.category) || undefined;
    }

    if (req.body?.branchId !== undefined) {
      payload.branch = req.body?.branchId || undefined;
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      payload,
      { new: true }
    )
      .populate('branch', 'name')
      .populate('createdBy', 'name email');

    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    res.json(expense);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExpenseController = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    res.json({ message: 'Gasto eliminado' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
