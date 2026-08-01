import { Request, Response } from 'express';
import * as checkoutService from '../services/checkoutService';

export const checkoutController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const body = req.body || {};

    let sale;
    if (body.cartId) {
      sale = await checkoutService.checkoutCart({ ...body, userId });
    } else {
      sale = await checkoutService.checkoutDirect({ ...body, userId });
    }

    res.status(201).json(sale);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
