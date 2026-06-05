import { Request, Response } from 'express';
import * as stockService from '../services/stockService';
import { MovementType } from '../models/StockMovement';

export const handleManualAdjustment = async (req: Request, res: Response) => {
  try {
    const { productId, branchId, quantity, type, notes } = req.body;
    const userId = (req as any).user.id;

    if (!productId || !branchId || quantity === undefined || !type) {
      return res.status(400).json({ message: 'Faltan datos requeridos para el ajuste de stock' });
    }

    const result = await stockService.adjustStock({
      productId,
      branchId,
      quantity: type === 'remove' ? -Math.abs(quantity) : Math.abs(quantity),
      type: MovementType.MANUAL_ADJUSTMENT,
      userId,
      notes: notes || 'Ajuste manual de administrador'
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductStockDetails = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const details = await stockService.getProductStockByBranch(productId);
    res.json(details);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const movements = await stockService.getMovements();
    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};