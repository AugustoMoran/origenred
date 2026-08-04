import { MarketplaceOrder, IMarketplaceOrder } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';
import { getSellerByUserId } from './sellerService';
import { notifyUserPush } from '../../notifications/chatPushService';

type FulfillmentStatus = 'processing' | 'shipped' | 'delivered';

const deriveOrderStatus = (statuses: FulfillmentStatus[]) => {
  if (statuses.length === 0) return 'paid';
  if (statuses.every((s) => s === 'delivered')) return 'delivered';
  if (statuses.every((s) => s === 'shipped' || s === 'delivered')) return 'shipped';
  if (statuses.some((s) => s === 'shipped' || s === 'delivered')) return 'shipped';
  return 'processing';
};

const ensureSellerFulfillment = (order: IMarketplaceOrder) => {
  if (order.shippingBySeller?.length) {
    order.shippingBySeller = order.shippingBySeller.map((entry: any) => ({
      seller: entry.seller,
      sellerName: entry.sellerName,
      shippingCost: entry.shippingCost ?? 0,
      status: entry.status || 'processing',
      trackingCode: entry.trackingCode,
      shippedAt: entry.shippedAt,
    }));
    return;
  }

  const seen = new Map<string, { sellerName: string }>();
  for (const item of order.items) {
    const sellerId = String(item.seller);
    if (!seen.has(sellerId)) {
      seen.set(sellerId, { sellerName: '' });
    }
  }

  order.shippingBySeller = Array.from(seen.entries()).map(([sellerId]) => ({
    seller: sellerId as any,
    sellerName: '',
    shippingCost: 0,
    status: 'processing' as FulfillmentStatus,
  }));
};

export const updateSellerOrderFulfillment = async (
  userId: string,
  orderNumber: string,
  input: { status: FulfillmentStatus; trackingCode?: string }
) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) throw new Error('Perfil de vendedor no encontrado');

  const order = await MarketplaceOrder.findOne({ orderNumber });
  if (!order) throw new Error('Pedido no encontrado');

  const hasSellerItems = order.items.some((i) => String(i.seller) === String(profile._id));
  if (!hasSellerItems) throw new Error('Este pedido no incluye tus productos');

  if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) {
    throw new Error('El pedido no puede actualizarse en este estado');
  }

  ensureSellerFulfillment(order);

  const sellerId = String(profile._id);
  const entry = order.shippingBySeller?.find((s: any) => String(s.seller) === sellerId);
  if (!entry) throw new Error('Envío del vendedor no encontrado');

  const current = (entry.status || 'processing') as FulfillmentStatus;
  const next = input.status;

  const allowed: Record<FulfillmentStatus, FulfillmentStatus[]> = {
    processing: ['processing', 'shipped'],
    shipped: ['shipped', 'delivered'],
    delivered: ['delivered'],
  };

  if (!allowed[current]?.includes(next)) {
    throw new Error(`No se puede cambiar de ${current} a ${next}`);
  }

  entry.status = next;
  if (input.trackingCode) entry.trackingCode = input.trackingCode.trim();
  if (next === 'shipped') entry.shippedAt = new Date();

  const statuses = (order.shippingBySeller || []).map(
    (s: any) => (s.status || 'processing') as FulfillmentStatus
  );
  order.status = deriveOrderStatus(statuses) as any;

  if (next === 'shipped' && input.trackingCode && !order.trackingCode) {
    order.trackingCode = input.trackingCode.trim();
  }

  order.markModified('shippingBySeller');
  await order.save();

  if (order.buyer && (next === 'shipped' || next === 'delivered')) {
    const label = next === 'shipped' ? 'Tu pedido fue enviado' : 'Tu pedido fue entregado';
    const tracking = entry.trackingCode || order.trackingCode;
    const body = tracking
      ? `Pedido ${order.orderNumber} — tracking: ${tracking}`
      : `Pedido ${order.orderNumber}`;
    await notifyUserPush(String(order.buyer), label, body, {
      type: 'order',
      orderNumber: order.orderNumber,
      status: next,
    });
  }

  return order;
};

export const initOrderFulfillmentOnPayment = (order: IMarketplaceOrder) => {
  ensureSellerFulfillment(order);
  if (order.shippingBySeller?.length) {
    order.shippingBySeller = order.shippingBySeller.map((entry: any) => ({
      ...entry,
      status: entry.status || 'processing',
    }));
    order.status = 'processing';
    order.markModified('shippingBySeller');
  }
};

const buyerIdFromOrder = (order: IMarketplaceOrder) => {
  const buyer = order.buyer as unknown;
  if (!buyer) return null;
  if (typeof buyer === 'object' && buyer !== null && '_id' in buyer) {
    return String((buyer as { _id: unknown })._id);
  }
  return String(buyer);
};

export const canViewFullOrder = async (
  order: IMarketplaceOrder,
  user?: { _id: string; roles?: string[] }
): Promise<boolean> => {
  if (!user) return false;
  if (user.roles?.includes('admin')) return true;

  const buyerId = buyerIdFromOrder(order);
  if (buyerId && buyerId === String(user._id)) return true;

  if (user.roles?.includes('vendedor_marketplace')) {
    const profile = await getSellerByUserId(String(user._id));
    if (profile) {
      const sellerId = String(profile._id);
      if (order.items?.some((item) => String(item.seller) === sellerId)) return true;
      if (order.shippingBySeller?.some((s) => String(s.seller) === sellerId)) return true;
    }
  }

  return false;
};

/** Vista limitada para confirmación de checkout sin sesión */
export const toPublicOrderSummary = (order: IMarketplaceOrder) => ({
  orderNumber: order.orderNumber,
  total: order.total,
  status: order.status,
  chatEnabled: order.chatEnabled,
  items: order.items?.map((item) => ({
    listing: item.listing,
    title: item.title,
    quantity: item.quantity,
    subtotal: item.subtotal,
  })),
});
