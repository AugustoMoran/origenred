import { Report } from '../models/Report';
import { Listing } from '../models/Listing';

export const REPORT_REASONS = [
  'producto_falso',
  'precio_incorrecto',
  'contenido_inapropiado',
  'estafa',
  'otro',
] as const;

export const REPORT_REASON_LABELS: Record<string, string> = {
  producto_falso: 'Producto falso o engañoso',
  precio_incorrecto: 'Precio incorrecto',
  contenido_inapropiado: 'Contenido inapropiado',
  estafa: 'Posible estafa',
  otro: 'Otro',
};

export const createReport = async (input: {
  reporterId: string;
  listingId?: string;
  sellerId?: string;
  orderId?: string;
  reason: string;
  description?: string;
}) => {
  if (!input.reason) throw new Error('Seleccioná un motivo');
  if (!input.listingId && !input.sellerId && !input.orderId) {
    throw new Error('Falta referencia de la denuncia');
  }

  const report = await Report.create({
    reporter: input.reporterId,
    listing: input.listingId,
    seller: input.sellerId,
    order: input.orderId,
    reason: input.reason,
    description: input.description,
    status: 'pending',
  });

  // Marcar listing para moderación si es denuncia de producto
  if (input.listingId) {
    await Listing.findByIdAndUpdate(input.listingId, {
      moderated: true,
      moderationReason: `Denuncia: ${input.reason}`,
      status: 'moderated',
    });
  }

  return report;
};

export const listPendingReports = () =>
  Report.find({ status: { $in: ['pending', 'reviewing'] } })
    .populate('reporter', 'name email')
    .populate('listing', 'title slug status')
    .populate('seller', 'businessName slug')
    .sort({ createdAt: -1 });

export const listAllReports = (status?: string) => {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  return Report.find(filter)
    .populate('reporter', 'name email')
    .populate('listing', 'title slug status')
    .populate('seller', 'businessName slug')
    .sort({ createdAt: -1 });
};

export const updateReportStatus = async (
  reportId: string,
  status: 'reviewing' | 'resolved' | 'dismissed',
  adminId: string,
  resolution?: string
) => {
  const report = await Report.findById(reportId);
  if (!report) throw new Error('Denuncia no encontrada');

  report.status = status;
  report.resolvedBy = adminId as any;
  if (resolution) report.resolution = resolution;
  await report.save();

  // Si se desestima, reactivar listing si estaba moderado
  if (status === 'dismissed' && report.listing) {
    await Listing.findByIdAndUpdate(report.listing, {
      moderated: false,
      moderationReason: undefined,
      status: 'active',
    });
  }

  return report;
};
