import { Request, Response } from 'express';
import afipService from '../services/afipService';

export const getTaxpayerController = async (req: Request, res: Response) => {
  try {
    const { cuit } = req.params;
    if (!cuit) {
      return res.status(200).json({
        ok: false,
        found: false,
        message: 'CUIT es requerido',
        data: null,
      });
    }

    const data = await afipService.getTaxpayerDetails(cuit);

    if (!data || (data as any)._notFound) {
      return res.status(200).json({
        ok: true,
        found: false,
        message: (data as any)?._message || 'Contribuyente no encontrado en los padrones de AFIP',
        data: {
          cuit: String(cuit).replace(/\D/g, ''),
          nombre: '',
          razonSocial: '',
          fiscalCondition: '',
          suggestedInvoiceType: 'B',
          domicilioFiscal: null,
          _notFound: true,
          _afipAuthError: Boolean((data as any)?._afipAuthError),
        },
      });
    }

    res.status(200).json({
      ok: true,
      found: true,
      message: 'Contribuyente encontrado',
      data,
    });
  } catch (error: any) {
    res.status(200).json({
      ok: false,
      found: false,
      message: error.message,
      data: null,
    });
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
