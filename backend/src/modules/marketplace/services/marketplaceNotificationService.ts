import { Conversation, Message } from '../models/Chat';
import { SellerProfile } from '../models/SellerProfile';
import { getUnreadChatCount } from './chatService';
import {
  listPersistedNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './marketplaceNotificationStoreService';
import { MarketplaceNotificationItem } from '../types/marketplaceNotificationTypes';

export type { MarketplaceNotificationItem };

export const getUserNotificationSummary = async (userId: string) => {
  const unreadChatMessages = await getUnreadChatCount(userId);
  const items = await buildNotificationItems(userId);
  const persistedUnreadInFeed = items.filter((i) => i.type !== 'chat' && i.unread).length;

  return {
    unreadChatMessages,
    items,
    totalUnread: unreadChatMessages + persistedUnreadInFeed,
  };
};

export const buildNotificationItems = async (userId: string): Promise<MarketplaceNotificationItem[]> => {
  const chatItems = await buildChatNotificationItems(userId);
  const persistedItems = await listPersistedNotifications(userId);

  return [...chatItems, ...persistedItems]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 40);
};

export const buildChatNotificationItems = async (userId: string): Promise<MarketplaceNotificationItem[]> => {
  const items: MarketplaceNotificationItem[] = [];

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
  }

  return items;
};

export { markNotificationRead, markAllNotificationsRead };
