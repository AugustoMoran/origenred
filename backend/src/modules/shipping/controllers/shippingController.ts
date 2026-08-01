import { Request, Response } from 'express';
import * as envioPackService from '../services/envioPackService';

export const getShippingMethodsController = async (_req: Request, res: Response) => {
  try {
    const methods = await envioPackService.getShippingMethods();
    res.json(methods);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const quoteShippingController = async (req: Request, res: Response) => {
  try {
    const { postalCode, city, province, weight, subtotal } = req.body || {};
    if (!postalCode) {
      return res.status(400).json({ message: 'postalCode es requerido' });
    }

    const quote = await envioPackService.quoteShipping({
      postalCode: String(postalCode),
      city,
      province,
      weight: Number(weight),
      subtotal: Number(subtotal),
    });
    res.json(quote);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
