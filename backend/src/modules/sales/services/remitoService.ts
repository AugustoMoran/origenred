import PDFDocument from 'pdfkit';
import { ISale } from '../models/Sale';

type RemitoMode = 'logistico' | 'comercial';

interface RemitoPdfOptions {
  mode?: RemitoMode;
}

export class RemitoService {
  static async generatePDF(sale: ISale, options: RemitoPdfOptions = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];
        const mode: RemitoMode = options.mode === 'comercial' ? 'comercial' : 'logistico';
        const isLogistic = mode === 'logistico';

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const formatMoney = (value: number) =>
          `$${(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const remitoNumber = sale.remitoNumber || `RMT-${String(sale._id).slice(-8).toUpperCase()}`;
        const companyName = process.env.COMPANY_NAME || 'PLATAFORMA DE FACTURACION S.A.';
        const companyAddress = process.env.COMPANY_ADDRESS || '-';
        const companyCuit = process.env.COMPANY_CUIT || '-';

        doc.rect(0, 0, doc.page.width, 90).fill('#111827');
        doc.fillColor('#F8FAFC').font('Helvetica-Bold').fontSize(23).text(isLogistic ? 'Remito de Entrega' : 'Remito', 40, 30);
        doc.fillColor('#CBD5E1').font('Helvetica').fontSize(11).text(`N° ${remitoNumber}`, 420, 36, { width: 130, align: 'right' });
        doc.fillColor('#CBD5E1').fontSize(10).text(new Date(sale.createdAt).toLocaleString('es-AR'), 420, 54, { width: 130, align: 'right' });

        let y = 120;
        doc.roundedRect(40, y, 515, 92, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text(companyName, 54, y + 12);
        doc.fillColor('#334155').font('Helvetica').fontSize(10).text(`CUIT: ${companyCuit}`, 54, y + 34);
        doc.text(`Dirección: ${companyAddress}`, 54, y + 50);
        doc.text(`Cliente: ${sale.clientName || 'Consumidor final'}`, 320, y + 34, { width: 220 });
        doc.text(`CUIT/DNI: ${sale.clientCuit || '-'}`, 320, y + 50, { width: 220 });

        y += 112;
        doc.roundedRect(40, y, 515, 24, 6).fill('#E2E8F0');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10);
        if (isLogistic) {
          doc.text('Producto', 54, y + 7, { width: 340 });
          doc.text('Cantidad', 405, y + 7, { width: 60, align: 'right' });
          doc.text('Observación', 472, y + 7, { width: 70, align: 'right' });
        } else {
          doc.text('Producto', 54, y + 7, { width: 250 });
          doc.text('Cantidad', 320, y + 7, { width: 70, align: 'right' });
          doc.text('Precio Unit.', 395, y + 7, { width: 70, align: 'right' });
          doc.text('Subtotal', 475, y + 7, { width: 65, align: 'right' });
        }
        y += 32;

        doc.font('Helvetica').fontSize(10).fillColor('#0F172A');
        for (const item of sale.items || []) {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          if (isLogistic) {
            doc.text(item.name || '-', 54, y, { width: 340 });
            doc.text(String(item.quantity || 0), 405, y, { width: 60, align: 'right' });
            doc.text('-', 472, y, { width: 70, align: 'right' });
          } else {
            doc.text(item.name || '-', 54, y, { width: 250 });
            doc.text(String(item.quantity || 0), 320, y, { width: 70, align: 'right' });
            doc.text(formatMoney(item.price || 0), 395, y, { width: 70, align: 'right' });
            doc.text(formatMoney((item.quantity || 0) * (item.price || 0)), 475, y, { width: 65, align: 'right' });
          }
          y += 20;
          doc.moveTo(40, y + 2).lineTo(555, y + 2).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        }

        if (!isLogistic) {
          const totalsY = Math.max(y + 18, 650);
          doc.roundedRect(360, totalsY, 195, 72, 8).fillAndStroke('#FFFFFF', '#CBD5E1');
          doc.fillColor('#334155').font('Helvetica').fontSize(11).text('Total remito', 374, totalsY + 16);
          doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(15).text(formatMoney(sale.total || 0), 445, totalsY + 14, {
            width: 95,
            align: 'right',
          });

          doc.fillColor('#64748B').font('Helvetica').fontSize(9).text(
            'Documento interno valorizado. No reemplaza comprobante fiscal.',
            40,
            totalsY + 84,
            { width: 515, align: 'center' }
          );
        } else {
          let signatureY = Math.max(y + 32, 620);
          if (signatureY > 730) {
            doc.addPage();
            signatureY = 80;
          }

          doc.roundedRect(40, signatureY, 515, 120, 8).fillAndStroke('#FFFFFF', '#CBD5E1');
          doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Conformidad de recepción', 54, signatureY + 14);
          doc.fillColor('#475569').font('Helvetica').fontSize(9).text(
            'Dejo constancia de haber recibido la mercadería detallada en este remito.',
            54,
            signatureY + 32,
            { width: 470 }
          );

          const lineY = signatureY + 70;
          doc.moveTo(54, lineY).lineTo(240, lineY).strokeColor('#94A3B8').lineWidth(0.8).stroke();
          doc.moveTo(260, lineY).lineTo(360, lineY).stroke();
          doc.moveTo(380, lineY).lineTo(540, lineY).stroke();

          doc.fillColor('#64748B').fontSize(8)
            .text('Aclaración y firma', 54, lineY + 4)
            .text('DNI', 260, lineY + 4, { width: 100, align: 'center' })
            .text('Fecha / Hora', 380, lineY + 4, { width: 160, align: 'center' });

          doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(9).text(
            'DOCUMENTO NO VALORIZADO - USO LOGÍSTICO',
            40,
            signatureY + 130,
            { width: 515, align: 'center' }
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
