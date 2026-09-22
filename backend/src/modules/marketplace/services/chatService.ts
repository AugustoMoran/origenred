import { Conversation, Message, IConversation } from '../models/Chat';
import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';
import { attachExistingBuyerFromGuestEmail, ensureConversationForOrder } from './guestOrderService';
import { mongoRefId as refId } from '../../../shared/utils/mongoRefId';

const CHAT_CLOSED_ORDER_STATUSES = new Set([
  'pending_payment',
  'cancelled',
  'refunded',
  'delivered',
]);

const CHAT_OPEN_ORDER_STATUSES = new Set(['paid', 'processing', 'shipped']);

/** Chat abierto desde el pago hasta marcar el pedido como entregado. */
export const isOrderChatActive = (
  order: { chatEnabled?: boolean; status?: string } | null | undefined
): boolean => {
  if (!order) return false;
  const status = String(order.status || '');
  if (CHAT_CLOSED_ORDER_STATUSES.has(status)) return false;
  if (CHAT_OPEN_ORDER_STATUSES.has(status)) return true;
  return Boolean(order.chatEnabled);
};

export const getBuyerConversations = async (buyerId: string) => {
  const conversations = await Conversation.find({ buyer: buyerId })
    .populate('order', 'orderNumber status total items createdAt chatEnabled')
    .populate('seller', 'businessName slug')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  const filtered = conversations.filter((c) => {
    const order = c.order as any;
    return isOrderChatActive(order);
  });

  return attachUnreadCounts(filtered, buyerId);
};

export const getSellerConversations = async (userId: string) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) return [];

  const conversations = await Conversation.find({ seller: profile._id })
    .populate('order', 'orderNumber status total items createdAt chatEnabled')
    .populate('buyer', 'name email')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  const filtered = conversations.filter((c) => {
    const order = c.order as any;
    return isOrderChatActive(order);
  });

  return attachUnreadCounts(filtered, userId);
};

const attachUnreadCounts = async (conversations: IConversation[], userId: string) => {
  const result = [];
  for (const c of conversations) {
    const unreadCount = await Message.countDocuments({
      conversation: c._id,
      sender: { $ne: userId },
      readAt: { $exists: false },
    });
    result.push({ ...c.toObject(), unreadCount });
  }
  return result;
};

export const getConversationMessages = async (conversationId: string, userId: string) => {
  const conversation = await Conversation.findById(conversationId)
    .populate('seller', 'user businessName')
    .populate('buyer', 'name email');

  if (!conversation) throw new Error('Conversación no encontrada');

  const seller = conversation.seller as any;
  const isBuyer = refId(conversation.buyer) === userId;
  const isSeller = refId(seller?.user) === userId;

  if (!isBuyer && !isSeller) throw new Error('Acceso denegado');

  const order = await MarketplaceOrder.findById(conversation.order);
  if (!isOrderChatActive(order)) {
    throw new Error('El chat ya no está disponible para este pedido');
  }

  const messages = await Message.find({ conversation: conversationId })
    .populate('sender', 'name email')
    .sort({ createdAt: 1 });

  // Marcar como leídos los mensajes del otro
  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, readAt: { $exists: false } },
    { readAt: new Date() }
  );

  return { conversation, messages };
};

export const sendMessage = async (conversationId: string, userId: string, body: string) => {
  const text = String(body || '').trim();
  if (!text) throw new Error('Mensaje vacío');
  if (text.length > 4000) throw new Error('Mensaje demasiado largo');

  const conversation = await Conversation.findById(conversationId).populate('seller', 'user');
  if (!conversation) throw new Error('Conversación no encontrada');

  const seller = conversation.seller as any;
  const isBuyer = refId(conversation.buyer) === userId;
  const isSeller = refId(seller?.user) === userId;
  if (!isBuyer && !isSeller) throw new Error('Acceso denegado');

  const order = await MarketplaceOrder.findById(conversation.order);
  if (!isOrderChatActive(order)) {
    throw new Error('El chat ya no está disponible para este pedido');
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    body: text,
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  const populated = await Message.findById(message._id).populate('sender', 'name email');
  return populated;
};

export const getConversationByOrder = async (orderNumber: string, userId: string) => {
  let order = await MarketplaceOrder.findOne({ orderNumber });
  if (!order) throw new Error('Pedido no encontrado');
  if (!isOrderChatActive(order)) throw new Error('Chat no disponible');

  if (!order.buyer) {
    await attachExistingBuyerFromGuestEmail(order);
    await ensureConversationForOrder(order);
  }

  const isBuyer = order.buyer && refId(order.buyer) === userId;
  let isSeller = false;
  if (!isBuyer) {
    const profile = await SellerProfile.findOne({ user: userId });
    if (profile) {
      isSeller = order.items.some((i) => String(i.seller) === String(profile._id));
    }
  }

  if (!isBuyer && !isSeller) throw new Error('Acceso denegado');

  let conversation = await Conversation.findOne({ order: order._id });
  const orderBuyerId = order.buyer ? refId(order.buyer) : '';
  const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);

  if (conversation && orderBuyerId && isValidObjectId(orderBuyerId)) {
    const currentBuyer = refId(conversation.buyer);
    if (!isValidObjectId(currentBuyer)) {
      conversation.buyer = orderBuyerId as any;
      await conversation.save();
    }
  }

  if (!conversation && orderBuyerId && (isBuyer || isSeller)) {
    const sellerId = order.items[0]?.seller;
    if (sellerId) {
      conversation = await Conversation.create({
        order: order._id,
        buyer: orderBuyerId,
        seller: sellerId,
        lastMessageAt: new Date(),
      });
    }
  }

  if (!conversation) {
    if (!order.buyer && order.guestEmail) {
      throw new Error(
        'El comprador aún no tiene cuenta. Coordiná por email o teléfono hasta que se registre con el mismo email de la compra.'
      );
    }
    throw new Error('Conversación no encontrada');
  }

  return getConversationMessages(String(conversation._id), userId);
};

export const canAccessConversation = async (conversationId: string, userId: string) => {
  const conversation = await Conversation.findById(conversationId).populate('seller', 'user');
  if (!conversation) return false;

  const seller = conversation.seller as any;
  const isBuyer = refId(conversation.buyer) === userId;
  const isSeller = refId(seller?.user) === userId;
  if (!isBuyer && !isSeller) return false;

  const order = await MarketplaceOrder.findById(conversation.order);
  return isOrderChatActive(order);
};

export const getSellerOrders = async (userId: string) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) return [];

  return MarketplaceOrder.find({
    'items.seller': profile._id,
    status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
  })
    .populate('buyer', 'name email')
    .sort({ createdAt: -1 });
};

/** Mensajes no leídos en conversaciones del usuario (comprador o vendedor) */
export const getUnreadChatCount = async (userId: string) => {
  const buyerConversations = await Conversation.find({ buyer: userId }).select('_id');
  const profile = await SellerProfile.findOne({ user: userId });
  const sellerConversations = profile
    ? await Conversation.find({ seller: profile._id }).select('_id')
    : [];

  const conversationIds = [
    ...buyerConversations.map((c) => c._id),
    ...sellerConversations.map((c) => c._id),
  ];

  if (!conversationIds.length) return 0;

  return Message.countDocuments({
    conversation: { $in: conversationIds },
    sender: { $ne: userId },
    readAt: { $exists: false },
  });
};
