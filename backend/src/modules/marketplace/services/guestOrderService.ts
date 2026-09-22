import crypto from 'crypto';
import { MarketplaceOrder, IMarketplaceOrder } from '../models/MarketplaceOrder';
import { Conversation } from '../models/Chat';
import { User } from '../../auth/models/User';
import { SellerProfile } from '../models/SellerProfile';
import { sendEmail } from '../../../shared/services/emailService';
import { formatShipFromAddressLine } from './sellerShipFromService';
import { createMarketplaceNotification } from './marketplaceNotificationStoreService';
import { mongoRefId } from '../../../shared/utils/mongoRefId';

export const generateGuestAccessToken = () => crypto.randomBytes(24).toString('hex');

const frontendUrl = () => process.env.FRONTEND_URL || 'https://origenred.com.ar';

export const buildGuestOrderTrackUrl = (orderNumber: string, token: string) =>
  `${frontendUrl()}/compras/seguimiento/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(token)}`;

export async function linkGuestOrdersToBuyer(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const orders = await MarketplaceOrder.find({
    $or: [{ buyer: { $exists: false } }, { buyer: null }],
    guestEmail: normalized,
    status: { $nin: ['cancelled'] },
  });

  for (const order of orders) {
    order.buyer = userId as any;
    await order.save();
    await ensureConversationForOrder(order);
  }

  return orders.length;
}

export async function ensureConversationForOrder(order: IMarketplaceOrder) {
  if (!order.chatEnabled) return null;
  const buyerId = order.buyer ? mongoRefId(order.buyer) : null;
  const sellerId = order.items[0]?.seller;
  if (!buyerId || !sellerId) return null;

  return Conversation.findOneAndUpdate(
    { order: order._id },
    {
      order: order._id,
      buyer: buyerId,
      seller: sellerId,
      lastMessageAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

export async function attachExistingBuyerFromGuestEmail(order: IMarketplaceOrder) {
  if (order.buyer || !order.guestEmail) return order;
  const user = await User.findOne({ email: order.guestEmail.trim().toLowerCase() });
  if (!user) return order;
  order.buyer = user._id;
  await order.save();
  return order;
}

export async function sendGuestOrderConfirmationEmail(order: IMarketplaceOrder) {
  const email = order.guestEmail?.trim().toLowerCase();
  if (!email) return;

  const withToken = await MarketplaceOrder.findById(order._id).select('+guestAccessToken');
  const token = withToken?.guestAccessToken;
  if (!token) return;

  const trackUrl = buildGuestOrderTrackUrl(order.orderNumber, token);
  const registerUrl = `${frontendUrl()}/registro?email=${encodeURIComponent(email)}`;

  let pickupBlock = '';
  if (order.shippingMethod === 'pickup' && order.shippingBySeller?.length) {
    const lines = order.shippingBySeller.map((row) => {
      const label = row.shipFromLabel || row.sellerName || 'Vendedor';
      const addr = formatShipFromAddressLine({
        street: row.shipFromStreet || '',
        city: row.shipFromCity || '',
        province: row.shipFromProvince || '',
        postalCode: row.shipFromPostalCode || '',
        label,
        source: row.shipFromSource === 'platform' ? 'platform' : 'seller',
      });
      return `<li><strong>${label}</strong><br/>${addr}</li>`;
    });
    pickupBlock = `
      <p><strong>Retiro en persona</strong></p>
      <ul>${lines.join('')}</ul>
      <p>Coordiná día y horario con el vendedor desde Mis compras (chat) una vez confirmado el pago.</p>
    `;
  }

  await sendEmail({
    to: email,
    subject: `Compra confirmada — pedido ${order.orderNumber}`,
    html: `
      <p>Hola ${order.guestName || order.shippingAddress?.fullName || ''},</p>
      <p>Tu pago fue confirmado en <strong>OrigenRed</strong>.</p>
      <p><strong>Pedido:</strong> ${order.orderNumber}<br/>
      <strong>Total:</strong> $${Number(order.total).toLocaleString('es-AR')}</p>
      ${pickupBlock}
      <p><a href="${trackUrl}">Seguir mi pedido</a></p>
      <p>Para chatear con el vendedor y ver tus compras en un solo lugar, creá tu cuenta con este mismo email:</p>
      <p><a href="${registerUrl}">Crear cuenta en OrigenRed</a></p>
      <p>— OrigenRed</p>
    `,
    text: `Pedido ${order.orderNumber} confirmado. Seguimiento: ${trackUrl} — Registro: ${registerUrl}`,
  });
}

export async function notifyAdminsNewMarketplaceOrder(order: IMarketplaceOrder) {
  const admins = await User.find({ roles: { $in: ['admin'] } }).select('_id');
  const buyerLabel =
    order.guestName ||
    order.shippingAddress?.fullName ||
    order.guestEmail ||
    'Comprador';

  const bodyLine = `${order.orderNumber} — ${buyerLabel} — $${Number(order.total).toLocaleString('es-AR')}`;

  let anyNew = false;
  for (const admin of admins) {
    const { created } = await createMarketplaceNotification({
      userId: String(admin._id),
      type: 'order',
      title: 'Nueva venta marketplace',
      body: bodyLine,
      href: '/dashboard/admin/marketplace-orders',
      orderNumber: order.orderNumber,
      referenceKey: `admin-order-${order._id}`,
    });
    if (created) anyNew = true;
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (anyNew && adminEmail) {
    const panelUrl = `${frontendUrl()}/dashboard/admin/marketplace-orders`;
    await sendEmail({
      to: adminEmail,
      subject: `Nueva venta — ${order.orderNumber}`,
      html: `
        <p>Se registró una venta en el marketplace.</p>
        <p><strong>${bodyLine}</strong></p>
        <p><a href="${panelUrl}">Ver pedidos en el panel admin</a></p>
        <p>— OrigenRed</p>
      `,
      text: `Nueva venta: ${bodyLine}. Panel: ${panelUrl}`,
    }).catch((err) => console.error('[admin-order-email]', err));
  }
}

export async function getOrderForGuestTracking(orderNumber: string, token: string) {
  const order = await MarketplaceOrder.findOne({ orderNumber });
  if (!order || !order.guestAccessToken || order.guestAccessToken !== token) {
    return null;
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    chatEnabled: order.chatEnabled,
    guestEmail: order.guestEmail,
    items: order.items?.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
    shippingAddress: order.shippingAddress,
    shippingMethod: order.shippingMethod,
    shippingBySeller: order.shippingBySeller,
    createdAt: order.createdAt,
  };
}

export function sellerBuyerContactFromOrder(order: IMarketplaceOrder) {
  const buyer = order.buyer as { name?: string; email?: string } | undefined;
  return {
    name: buyer?.name || order.guestName || order.shippingAddress?.fullName || 'Comprador',
    email: buyer?.email || order.guestEmail || null,
    phone: order.guestPhone || order.shippingAddress?.phone || null,
    shippingAddress: order.shippingAddress || null,
  };
}

export async function listAdminMarketplaceOrders(limit = 100) {
  return MarketplaceOrder.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('buyer', 'name email')
    .lean();
}
