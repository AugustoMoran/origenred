import { Conversation, Message } from '../models/Chat';
import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';
import { getUnreadChatCount } from './chatService';

export type MarketplaceNotificationItem = {
  id: string;
  type: 'chat' | 'order';
  title: string;
  body: string;
  href: string;
  at: string;
  unread?: boolean;
  orderNumber?: string;
};

const sinceDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

export const getUserNotificationSummary = async (userId: string) => {
  const unreadChatMessages = await getUnreadChatCount(userId);
  const items = await buildNotificationItems(userId);
  return { unreadChatMessages, items, totalUnread: unreadChatMessages + items.filter((i) => i.unread).length };
};

export const buildNotificationItems = async (userId: string): Promise<MarketplaceNotificationItem[]> => {
  const items: MarketplaceNotificationItem[] = [];
  const since = sinceDays(14);

  const buyerConversations = await Conversation.find({ buyer: userId })
    .populate('order', 'orderNumber status chatEnabled')
    .populate('seller', 'businessName')
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(15);

  for (const c of buyerConversations) {
    const order = c.order as any;
    if (!order?.chatEnabled) continue;
    const unreadCount = await Message.countDocuments({
      conversation: c._id,
      sender: { $ne: userId },
      readAt: { $exists: false },
    });
    const seller = c.seller as any;
    items.push({
      id: `chat-${c._id}`,
      type: 'chat',
      title: seller?.businessName ? `Mensajes — ${seller.businessName}` : 'Mensajes del pedido',
      body: order?.orderNumber ? `Pedido ${order.orderNumber}` : 'Conversación activa',
      href: `/cuenta/chat/${order?.orderNumber || ''}`,
      at: (c.lastMessageAt || c.updatedAt).toISOString(),
      unread: unreadCount > 0,
      orderNumber: order?.orderNumber,
    });
  }

  const profile = await SellerProfile.findOne({ user: userId });
  if (profile) {
    const sellerConversations = await Conversation.find({ seller: profile._id })
      .populate('order', 'orderNumber status chatEnabled')
      .populate('buyer', 'name')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(15);

    for (const c of sellerConversations) {
      const order = c.order as any;
      if (!order?.chatEnabled) continue;
      const unreadCount = await Message.countDocuments({
        conversation: c._id,
        sender: { $ne: userId },
        readAt: { $exists: false },
      });
      const buyer = c.buyer as any;
      items.push({
        id: `chat-seller-${c._id}`,
        type: 'chat',
        title: buyer?.name ? `Mensaje de ${buyer.name}` : 'Mensaje de comprador',
        body: order?.orderNumber ? `Pedido ${order.orderNumber}` : 'Conversación activa',
        href: `/cuenta/chat/${order?.orderNumber || ''}`,
        at: (c.lastMessageAt || c.updatedAt).toISOString(),
        unread: unreadCount > 0,
        orderNumber: order?.orderNumber,
      });
    }

    const sellerOrders = await MarketplaceOrder.find({
      'items.seller': profile._id,
      status: { $in: ['paid', 'processing'] },
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    for (const order of sellerOrders) {
      items.push({
        id: `seller-order-${order._id}`,
        type: 'order',
        title: 'Nueva venta',
        body: `Pedido ${order.orderNumber}`,
        href: '/vendedor/ventas',
        at: order.createdAt.toISOString(),
        orderNumber: order.orderNumber,
      });
    }
  }

  const buyerOrders = await MarketplaceOrder.find({
    buyer: userId,
    status: { $in: ['shipped', 'delivered', 'paid'] },
    updatedAt: { $gte: since },
  })
    .sort({ updatedAt: -1 })
    .limit(10);

  for (const order of buyerOrders) {
    const statusLabel =
      order.status === 'shipped'
        ? 'Tu pedido fue enviado'
        : order.status === 'delivered'
          ? 'Tu pedido fue entregado'
          : 'Pago confirmado';
    items.push({
      id: `buyer-order-${order._id}`,
      type: 'order',
      title: statusLabel,
      body: `Pedido ${order.orderNumber}`,
      href: `/cuenta/compras/${order.orderNumber}`,
      at: order.updatedAt.toISOString(),
      orderNumber: order.orderNumber,
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 30);
};
