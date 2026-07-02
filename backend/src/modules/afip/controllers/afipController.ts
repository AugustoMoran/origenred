import { Request, Response } from 'express';
import afipService from '../services/afipService';

export const getTaxpayerController = async (req: Request, res: Response) => {
  try {
    const { cuit } = req.params;
    if (!cuit) {
      return res.status(400).json({ message: 'CUIT es requerido' });
    }

    const data = await afipService.getTaxpayerDetails(cuit);
    
    if (!data) {
      return res.status(404).json({ message: 'Contribuyente no encontrado en los padrones de AFIP' });
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAfipStatusController = async (_req: Request, res: Response) => {
  try {
    const pvs = await afipService.getPointsOfSale();
    res.json({ ok: true, pointsOfSale: pvs });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
