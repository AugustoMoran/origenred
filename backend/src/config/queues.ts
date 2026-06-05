import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import afipService from '../modules/afip/services/afipService';
import Sale from '../modules/sales/models/Sale';
import CreditNote from '../modules/sales/models/CreditNote';
import { adjustStock } from '../modules/stock/services/stockService';
import { MovementType } from '../modules/stock/models/StockMovement';

// Configuración de Redis
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// 1. Cola de Facturación AFIP
export const afipQueue = new Queue('afip-billing', {
  connection,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// 2. Worker para procesar la factura
export const afipWorker = new Worker('afip-billing', async (job: any) => {
  const { saleId, invoiceData, entityType = 'sale', creditNoteId } = job.data;
  
  try {
    console.log(`Processing AFIP ${entityType}...`);
    
    // Llamada al servicio real de AFIP
    const afipResult = await afipService.createInvoice(invoiceData);

    if (entityType === 'credit-note') {
      const note = await CreditNote.findByIdAndUpdate(creditNoteId, {
        cae: afipResult.cae,
        caeExpiration: afipResult.caeFchVto,
        voucherNumber: afipResult.voucherNumber,
        billingStatus: 'COMPLETED',
        errorMessage: null,
      }, { new: true });

      if (!note) {
        throw new Error(`Nota de crédito no encontrada: ${creditNoteId}`);
      }

      if (note.affectsStock && !note.stockRevertedAt) {
        for (const item of note.items || []) {
          await adjustStock({
            productId: String(item.product),
            branchId: String(note.branch),
            quantity: Number(item.quantity || 0),
            type: MovementType.RETURN,
            userId: String(note.seller),
            reference: String(note._id),
            notes: `Devolución por Nota de Crédito ${note._id}`,
          });
        }

        note.stockRevertedAt = new Date();
        await note.save();
      }

      const completedTotals = await CreditNote.aggregate([
        {
          $match: {
            sale: note.sale,
            status: 'ACTIVE',
            billingStatus: 'COMPLETED',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]);

      const totalCredited = Number(completedTotals?.[0]?.total || 0);
      const sale = await Sale.findById(note.sale).select('total');
      if (sale) {
        const fullyRefunded = totalCredited >= Number(sale.total || 0) - 0.01;
        await Sale.findByIdAndUpdate(note.sale, {
          status: fullyRefunded ? 'REFUNDED' : 'COMPLETED',
        });
      }

      console.log(`AFIP Success for Credit Note ${creditNoteId}: CAE ${afipResult.cae}`);
      return afipResult;
    }

    // Actualizar la venta con el CAE
    await Sale.findByIdAndUpdate(saleId, {
      cae: afipResult.cae,
      caeExpiration: afipResult.caeFchVto,
      voucherNumber: afipResult.voucherNumber,
      billingStatus: 'COMPLETED'
    });

    console.log(`AFIP Success for Sale ${saleId}: CAE ${afipResult.cae}`);
    
    return afipResult;
  } catch (error: any) {
        console.error(`AFIP Job Failed (${entityType}):`, error.message);

        if (entityType === 'credit-note') {
          await CreditNote.findByIdAndUpdate(creditNoteId, {
            billingStatus: 'FAILED',
            errorMessage: error.message,
          });
        } else {
          await Sale.findByIdAndUpdate(saleId, {
            billingStatus: 'FAILED',
            errorMessage: error.message,
          });
        }

    throw error; // Re-throw para activar retries si está configurado
  }
}, { connection });

afipWorker.on('completed', (job: any) => {
  console.log(`Job ${job.id} completed!`);
});

afipWorker.on('failed', (job: any, err: any) => {
  console.log(`Job ${job?.id} failed: ${err.message}`);
});