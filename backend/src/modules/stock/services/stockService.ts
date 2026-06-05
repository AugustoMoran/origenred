import Product from '../../inventory/models/Product';
import BranchStock from '../models/BranchStock';
import StockMovement, { MovementType } from '../models/StockMovement';
import mongoose from 'mongoose';

export interface IStockAdjustment {
  productId: string;
  branchId: string;
  quantity: number;
  type: MovementType;
  userId: string;
  reference?: string;
  notes?: string;
}

export const adjustStock = async (data: IStockAdjustment) => {
  const runAdjustment = async (useTransaction: boolean) => {
    const session = useTransaction ? await mongoose.startSession() : null;

    if (session) {
      session.startTransaction();
    }

    try {
    const { productId, branchId, quantity, type, userId, reference, notes } = data;

    // 1. Obtener o crear el stock de la sucursal
    let branchStock = session
      ? await BranchStock.findOne({ product: productId, branch: branchId }).session(session)
      : await BranchStock.findOne({ product: productId, branch: branchId });
    
    if (!branchStock) {
      branchStock = new BranchStock({
        product: productId,
        branch: branchId,
        stock: 0
      });
    }

    const previousStock = branchStock.stock;
    
    // Si es una venta o salida, forzamos cantidad negativa para el incremento
    const finalQuantity = (type === MovementType.SALE || type === MovementType.TRANSFER_OUT) 
      ? -Math.abs(quantity) 
      : quantity;

    const nextBranchStock = branchStock.stock + finalQuantity;

    if (nextBranchStock < 0) {
      throw new Error('Stock insuficiente en la sucursal seleccionada para realizar la operación');
    }

    branchStock.stock = nextBranchStock;
    if (session) {
      await branchStock.save({ session });
    } else {
      await branchStock.save();
    }

    // 2. Recalcular y sincronizar stock global desde la suma por sucursal
    const branchRows = session
      ? await BranchStock.find({ product: productId }).select('stock').session(session)
      : await BranchStock.find({ product: productId }).select('stock');

    const totalStock = branchRows.reduce((acc, row) => acc + (row.stock || 0), 0);

    if (session) {
      await Product.findByIdAndUpdate(productId, { stock: totalStock }).session(session);
    } else {
      await Product.findByIdAndUpdate(productId, { stock: totalStock });
    }

    // 3. Registrar movimiento
    const movement = new StockMovement({
      product: productId,
      branch: branchId,
      type,
      quantity: Math.abs(quantity), // Guardamos siempre el absoluto en el registro de cantidad
      previousStock,
      currentStock: branchStock.stock,
      user: userId,
      reference,
      notes
    });
    if (session) {
      await movement.save({ session });
      await session.commitTransaction();
    } else {
      await movement.save();
    }

    return branchStock;
    } catch (error) {
      if (session?.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session?.endSession();
    }
  };

  try {
    return await runAdjustment(true);
  } catch (error: any) {
    const message = error?.message || '';
    const transactionNotSupported =
      message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
      message.includes('Transaction numbers');

    if (transactionNotSupported) {
      return await runAdjustment(false);
    }

    throw error;
  }
};

export const getProductStockByBranch = async (productId: string) => {
  const rows = await BranchStock.find({ product: productId }).populate('branch', 'name');

  let changed = false;
  for (const row of rows) {
    if (row.stock < 0) {
      row.stock = 0;
      await row.save();
      changed = true;
    }
  }

  if (changed) {
    const totalStock = rows.reduce((acc, row) => acc + (row.stock || 0), 0);
    await Product.findByIdAndUpdate(productId, { stock: totalStock });
  }

  return rows;
};

export const getMovements = async (filters: any = {}) => {
  return await StockMovement.find(filters)
    .populate('product', 'name sku')
    .populate('branch', 'name')
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
};