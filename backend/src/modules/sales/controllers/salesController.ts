import { Request, Response } from 'express';
import * as salesService from '../services/salesService';
import { InvoiceService } from '../services/invoiceService';
import { RemitoService } from '../services/remitoService';

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

export const getSalesController = async (req: Request, res: Response) => {
  try {
    const sales = await salesService.getAllSales();
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCreditNotesController = async (req: Request, res: Response) => {
  try {
    const saleId = req.query.saleId ? String(req.query.saleId) : undefined;
    const notes = await salesService.getCreditNotes(saleId ? { sale: saleId } : {});
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSaleByIdController = async (req: Request, res: Response) => {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(sale);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfitReportController = async (req: Request, res: Response) => {
  try {
    const from = parseDateParam(req.query.from, false);
    const to = parseDateParam(req.query.to, true);

    if (req.query.from && !from) {
      return res.status(400).json({ message: 'Fecha "from" inválida' });
    }

    if (req.query.to && !to) {
      return res.status(400).json({ message: 'Fecha "to" inválida' });
    }

    const report = await salesService.getProfitReport(from, to);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadInvoiceController = async (req: Request, res: Response) => {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await InvoiceService.generatePDF(sale);
    } catch (primaryError: any) {
      console.error('[sales][download-invoice] primary render failed, retrying safe mode', {
        saleId: req.params.id,
        message: primaryError?.message,
      });
      pdfBuffer = await InvoiceService.generatePDF(sale, { disableLogo: true, disableQr: true });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Factura-${sale.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('[sales][download-invoice] error', {
      saleId: req.params.id,
      message: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ message: error.message });
  }
};

export const downloadRemitoController = async (req: Request, res: Response) => {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const mode = String(req.query.mode || 'logistico').toLowerCase() === 'comercial' ? 'comercial' : 'logistico';

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await RemitoService.generatePDF(sale, { mode });
    } catch (primaryError: any) {
      console.error('[sales][download-remito] primary render failed, retrying safe mode', {
        saleId: req.params.id,
        mode,
        message: primaryError?.message,
      });
      pdfBuffer = await RemitoService.generatePDF(sale, { mode, disableLogo: true });
    }
    const remitoNumber = (sale as any).remitoNumber || sale.invoiceNumber || String(sale._id).slice(-8);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Remito-${remitoNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSaleController = async (req: Request, res: Response) => {
  try {
    // El userID viene del middleware de autenticación
    const sellerId = (req as any).user.id;
    const requesterRoles = (req as any).user.roles || [];
    const sale = await salesService.createSale(req.body, sellerId, requesterRoles);
    res.status(201).json(sale);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createCreditNoteController = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user.id;
    const note = await salesService.createCreditNote(req.body, sellerId);
    res.status(201).json(note);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSaleController = async (req: Request, res: Response) => {
  try {
    const sale = await salesService.updateSale(req.params.id, req.body);
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(sale);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteSaleController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deleted = await salesService.deleteSale(req.params.id, userId);
    if (!deleted) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json({ message: 'Venta eliminada y stock revertido correctamente' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
