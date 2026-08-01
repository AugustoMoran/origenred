import { Request, Response } from 'express';
import * as mercadopagoService from '../services/mercadopagoService';
import Sale from '../../sales/models/Sale';

export const getMercadoPagoConfigController = async (_req: Request, res: Response) => {
  try {
    res.json(mercadopagoService.getMercadoPagoConfig());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPreferenceController = async (req: Request, res: Response) => {
  try {
    const { saleId, payerEmail, backUrls } = req.body;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });

    const items = (sale.items || []).map((item) => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const preference = await mercadopagoService.createPaymentPreference({
      saleId: String(sale._id),
      title: `Pedido ${sale.invoiceNumber}`,
      total: sale.total,
      items,
      payerEmail,
      backUrls,
    });

    await Sale.findByIdAndUpdate(saleId, {
      paymentId: preference.id,
      paymentStatus: 'pending',
    });

    res.json(preference);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const mercadoPagoWebhookController = async (req: Request, res: Response) => {
  try {
    const result = await mercadopagoService.processWebhookNotification(req.body || req.query);

    if (result.processed && result.externalReference) {
      await Sale.findByIdAndUpdate(result.externalReference, {
        paymentId: result.paymentId,
        paymentStatus: result.status,
      });
    }

    res.status(200).json({ ok: true, ...result });
  } catch (error: any) {
    res.status(200).json({ ok: false, message: error.message });
  }
};

export const getPaymentStatusController = async (req: Request, res: Response) => {
  try {
    const payment = await mercadopagoService.getPaymentById(req.params.paymentId);
    res.json(payment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
