import { ReturnRequest } from '../models/ReturnRequest';
import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';
import {
  isMercadoPagoEnabled,
  refundMercadoPagoPayment,
} from './marketplacePaymentService';
import { createMarketplaceNotification } from './marketplaceNotificationStoreService';

export const RETURN_REASONS = [
  'producto_defectuoso',
  'no_recibido',
  'no_coincide',
  'otro',
] as const;

export const RETURN_REASON_LABELS: Record<string, string> = {
  producto_defectuoso: 'Producto defectuoso o dañado',
  no_recibido: 'No recibí el pedido',
  no_coincide: 'No coincide con lo publicado',
  otro: 'Otro motivo',
};

const RETURNABLE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

export const createReturnRequest = async (input: {
  buyerId: string;
  orderNumber: string;
  reason: string;
  description?: string;
}) => {
  if (!RETURN_REASONS.includes(input.reason as any)) {
    throw new Error('Motivo de devolución inválido');
  }

  const order = await MarketplaceOrder.findOne({ orderNumber: input.orderNumber, buyer: input.buyerId });
  if (!order) throw new Error('Pedido no encontrado');
  if (!RETURNABLE_STATUSES.includes(order.status)) {
    throw new Error('Este pedido no admite solicitud de devolución');
  }

  const existing = await ReturnRequest.findOne({ order: order._id, buyer: input.buyerId });
  if (existing && existing.status !== 'rejected') {
    throw new Error('Ya existe una solicitud de devolución para este pedido');
  }
  if (existing?.status === 'rejected') {
    await ReturnRequest.deleteOne({ _id: existing._id });
  }

  const sellerId = order.items[0]?.seller;
  if (!sellerId) throw new Error('Pedido sin vendedor asociado');

  const request = await ReturnRequest.create({
    order: order._id,
    orderNumber: order.orderNumber,
    buyer: input.buyerId,
    seller: sellerId,
    reason: input.reason,
    description: input.description?.trim(),
    status: 'pending',
  });

  const sellerProfile = await SellerProfile.findById(sellerId);
  if (sellerProfile?.user) {
    await createMarketplaceNotification({
      userId: String(sellerProfile.user),
      type: 'return',
      title: 'Nueva solicitud de devolución',
      body: `Pedido ${order.orderNumber}`,
      href: '/vendedor/devoluciones',
      orderNumber: order.orderNumber,
      referenceKey: `seller-return-${request._id}`,
    });
  }

  return request;
};

export const listBuyerReturnRequests = (buyerId: string) =>
  ReturnRequest.find({ buyer: buyerId })
    .populate('seller', 'businessName slug')
    .sort({ createdAt: -1 });

export const listSellerReturnRequests = async (userId: string) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) return [];
  return ReturnRequest.find({ seller: profile._id })
    .populate('buyer', 'name email')
    .sort({ createdAt: -1 });
};

export const listAdminReturnRequests = (status?: string) => {
  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') filter.status = status;
  return ReturnRequest.find(filter)
    .populate('buyer', 'name email')
    .populate('seller', 'businessName slug')
    .sort({ createdAt: -1 });
};

export const updateSellerReturnRequest = async (
  returnId: string,
  userId: string,
  status: 'approved' | 'rejected',
  sellerNote?: string
) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) throw new Error('Perfil de vendedor no encontrado');

  const request = await ReturnRequest.findOne({ _id: returnId, seller: profile._id });
  if (!request) throw new Error('Solicitud no encontrada');
  if (request.status !== 'pending') throw new Error('La solicitud ya fue procesada');

  request.status = status;
  if (sellerNote?.trim()) request.sellerNote = sellerNote.trim();
  await request.save();

  const buyerLabel =
    status === 'approved' ? 'Devolución aprobada' : 'Devolución rechazada';
  await createMarketplaceNotification({
    userId: String(request.buyer),
    type: 'return',
    title: buyerLabel,
    body: `Pedido ${request.orderNumber}`,
    href: '/cuenta/devoluciones',
    orderNumber: request.orderNumber,
    referenceKey: `buyer-return-${request._id}-${status}`,
  });

  return request;
};

export const updateAdminReturnRequest = async (
  returnId: string,
  adminId: string,
  status: 'approved' | 'rejected' | 'refunded',
  adminNote?: string
) => {
  const request = await ReturnRequest.findById(returnId);
  if (!request) throw new Error('Solicitud no encontrada');

  request.status = status;
  request.resolvedBy = adminId as any;
  if (adminNote?.trim()) request.adminNote = adminNote.trim();

  if (status === 'refunded') {
    const order = await MarketplaceOrder.findById(request.order);
    if (order) {
      if (order.paymentId && isMercadoPagoEnabled()) {
        try {
          const result = await refundMercadoPagoPayment(order.paymentId, order.total);
          if (!result.alreadyRefunded && !result.refund) {
            throw new Error('Mercado Pago no devolvió confirmación del reembolso');
          }
        } catch (error: any) {
          const msg = error?.message || 'Error desconocido';
          throw new Error(`Mercado Pago no procesó el reembolso: ${msg}`);
        }
      }
      order.status = 'refunded';
      order.paymentStatus = 'refunded';
      await order.save();
    }
  }

  await request.save();

  if (status === 'refunded') {
    await createMarketplaceNotification({
      userId: String(request.buyer),
      type: 'return',
      title: 'Reembolso procesado',
      body: `Pedido ${request.orderNumber}`,
      href: '/cuenta/devoluciones',
      orderNumber: request.orderNumber,
      referenceKey: `buyer-return-${request._id}-refunded`,
    });
  }

  return request;
};

export const getReturnRequestForOrder = async (buyerId: string, orderNumber: string) => {
  const order = await MarketplaceOrder.findOne({ orderNumber, buyer: buyerId });
  if (!order) return null;
  return ReturnRequest.findOne({ order: order._id, buyer: buyerId });
};
