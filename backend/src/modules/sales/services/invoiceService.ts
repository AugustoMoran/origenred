import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { ISale } from '../models/Sale';
import { getBrandLogoBuffer } from './brandLogo';

export class InvoiceService {
  static async generatePDF(sale: ISale): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        const isFiscal = sale.invoiceType !== 'NONE';
        const displayNumber = sale.invoiceNumber || `NO-FISCAL-${String(sale._id).slice(-8).toUpperCase()}`;
        const hasApprovedCae = !!sale.cae && sale.billingStatus === 'COMPLETED';

        const formatMoney = (value: number) =>
          `$${(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const drawLabelValue = (x: number, y: number, label: string, value: string, width = 220) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#64748B')
            .text(label.toUpperCase(), x, y, { width, lineBreak: false });
          doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor('#0F172A')
            .text(value || '-', x, y + 12, { width });
        };

        // --- Header band ---
        doc.save();
        doc.rect(0, 0, doc.page.width, 95).fill('#111827');
        doc.restore();

        const brandLogo = getBrandLogoBuffer();
        if (brandLogo) {
          try {
            doc.roundedRect(470, 14, 78, 62, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
            doc.image(brandLogo, 476, 18, { fit: [66, 54], align: 'center', valign: 'center' });
          } catch {
            // Ignorar fallo de imagen sin romper la generación del PDF
          }
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(24)
          .fillColor('#F8FAFC')
          .text(isFiscal ? 'Factura Electrónica' : 'Comprobante de Venta', 40, 28, { width: 360 });
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#94A3B8')
          .text(
            isFiscal
              ? 'Comprobante fiscal sujeto a validación AFIP'
              : 'Documento interno (cotización / no fiscal)',
            40,
            62,
            { width: 380 }
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#E2E8F0')
          .text(`Tipo: ${sale.invoiceType}`, 345, 36, { width: 105, align: 'right' });
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#CBD5E1')
          .text(new Date(sale.createdAt).toLocaleString('es-AR'), 305, 56, { width: 145, align: 'right' });

        let y = 120;

        const populatedBranch =
          sale.branch && typeof sale.branch === 'object' ? (sale.branch as any) : null;
        const branchAddress = (populatedBranch?.address || '').trim();

        // Empresa: mail fijo solicitado, CUIT desde env, dirección real de la sucursal de la venta
        const companyName = process.env.COMPANY_NAME || 'PLATAFORMA DE FACTURACION S.A.';
        const companyCuit = process.env.COMPANY_CUIT || '-';
        const companyAddress = branchAddress || process.env.COMPANY_ADDRESS || '-';
        const companyEmail = 'Ososoundinstrumentosmusicales@gmail.com';

        // Company box
        doc.roundedRect(40, y, 255, 118, 10).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(companyName, 54, y + 16, { width: 225 });
        drawLabelValue(54, y + 44, 'CUIT', companyCuit, 225);
        drawLabelValue(54, y + 76, 'Dirección', companyAddress, 225);
        doc.font('Helvetica').fontSize(10).fillColor('#334155').text(companyEmail, 54, y + 100, { width: 225 });

        // Invoice info box
        doc.roundedRect(310, y, 245, 118, 10).fillAndStroke('#FFFFFF', '#E2E8F0');
        drawLabelValue(324, y + 16, 'Nro Comprobante', displayNumber, 217);
        drawLabelValue(324, y + 48, 'Punto de Venta', '00001', 217);
        drawLabelValue(324, y + 80, 'CAE', isFiscal ? (sale.cae || 'PENDIENTE') : 'NO FISCAL', 217);

        y += 140;

        // Client box
        doc.roundedRect(40, y, 515, 74, 10).fillAndStroke('#FFFFFF', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A').text('Datos del cliente', 54, y + 14);
        doc.font('Helvetica').fontSize(11).fillColor('#0F172A').text(`Nombre: ${sale.clientName || 'Consumidor Final'}`, 54, y + 34, { width: 245 });
        doc.text(`CUIT/DNI: ${sale.clientCuit || '-'}`, 320, y + 34, { width: 220 });
        if (sale.clientAddress) {
          doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`Dirección: ${sale.clientAddress}`, 54, y + 52, { width: 480 });
        }

        y += 92;

        // --- Items header ---
        const colX = {
          item: 54,
          qty: 300,
          unit: 355,
          iva: 435,
          subtotal: 490,
        };

        doc.roundedRect(40, y, 515, 24, 6).fill('#E2E8F0');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10);
        doc.text('Producto', colX.item, y + 7, { width: 220 });
        doc.text('Cant.', colX.qty, y + 7, { width: 50, align: 'right' });
        doc.text('Precio Unit.', colX.unit, y + 7, { width: 74, align: 'right' });
        doc.text('IVA %', colX.iva, y + 7, { width: 50, align: 'right' });
        doc.text('Subtotal', colX.subtotal, y + 7, { width: 55, align: 'right' });
        y += 30;

        // --- Items body ---
        doc.font('Helvetica').fontSize(10).fillColor('#0F172A');
        for (const item of sale.items) {
          if (y > 680) {
            doc.addPage();
            y = 50;
          }

          doc.text(item.name || '-', colX.item, y, { width: 220 });
          doc.text(String(item.quantity || 0), colX.qty, y, { width: 50, align: 'right' });
          doc.text(formatMoney(item.price || 0), colX.unit, y, { width: 74, align: 'right' });
          doc.text(`${item.ivaRate || 0}%`, colX.iva, y, { width: 50, align: 'right' });
          doc.text(formatMoney((item.quantity || 0) * (item.price || 0)), colX.subtotal, y, { width: 55, align: 'right' });
          y += 20;

          doc.moveTo(40, y + 2).lineTo(555, y + 2).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        }

        const totalsY = Math.max(y + 16, 610);

        // --- Totals ---
        doc.roundedRect(350, totalsY, 205, 110, 10).fillAndStroke('#FFFFFF', '#CBD5E1');
        doc.font('Helvetica').fontSize(11).fillColor('#334155').text('Subtotal Neto', 364, totalsY + 16);
        doc.font('Helvetica-Bold').fillColor('#0F172A').text(formatMoney(sale.totalNeto || 0), 445, totalsY + 16, { width: 96, align: 'right' });

        doc.font('Helvetica').fontSize(11).fillColor('#334155').text('IVA Total', 364, totalsY + 40);
        doc.font('Helvetica-Bold').fillColor('#0F172A').text(formatMoney(sale.totalIva || 0), 445, totalsY + 40, { width: 96, align: 'right' });

        doc.moveTo(364, totalsY + 66).lineTo(541, totalsY + 66).strokeColor('#E2E8F0').lineWidth(1).stroke();
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F172A').text('TOTAL', 364, totalsY + 76);
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text(formatMoney(sale.total || 0), 445, totalsY + 76, { width: 96, align: 'right' });

        // --- AFIP Compliance (QR) ---
        if (isFiscal && hasApprovedCae) {
          const invoiceNumberPart = (sale.invoiceNumber || '').split('-')[1] || '0';
          const clientDoc = Number((sale.clientCuit || '').replace(/\D/g, '')) || 0;
          const companyDoc = Number((process.env.COMPANY_CUIT || '30123456789').replace(/\D/g, ''));

          const afipData = {
            ver: 1,
            fecha: sale.createdAt?.toISOString().split('T')[0],
            cuit: companyDoc,
            ptoVta: 1,
            tipoCodAut: 'CAE',
            codAut: Number((sale.cae || '').replace(/\D/g, '')) || 0,
            importe: sale.total,
            moneda: 'PES',
            ctz: 1,
            tipoDocRec: sale.clientCuit ? 80 : 99,
            nroDocRec: clientDoc,
            tipoCbte: 1,
            nroCbte: Number(invoiceNumberPart) || 0
          };

          const jsonBase64 = Buffer.from(JSON.stringify(afipData)).toString('base64');
          const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${jsonBase64}`;
          
          const qrImage = await QRCode.toDataURL(qrUrl);
          doc.image(qrImage, 40, totalsY, { width: 105 });
          
          doc.font('Helvetica').fontSize(8).fillColor('#334155').text('Comprobante autorizado por AFIP', 40, totalsY + 110, { width: 280 });
          doc.text(`CAE: ${sale.cae}`, 40, totalsY + 122, { width: 280 });
        } else {
          const qrTitle = isFiscal
            ? 'QR AFIP disponible una vez aprobado el CAE'
            : 'Comprobante interno no fiscal (sin QR AFIP)';
          doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(qrTitle, 40, totalsY + 110, { width: 280 });
          if (isFiscal) {
            doc.text(`Estado actual: ${sale.billingStatus || 'PENDING'}`, 40, totalsY + 122, { width: 280 });
          }
        }

        // Footer
        doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text('Generado por Plataforma de Facturación', 40, 805, {
          width: 515,
          align: 'center',
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
