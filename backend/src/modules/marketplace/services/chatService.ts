import { Conversation, Message } from '../models/Chat';
import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';

export const getBuyerConversations = async (buyerId: string) => {
  const conversations = await Conversation.find({ buyer: buyerId })
    .populate('order', 'orderNumber status total items createdAt chatEnabled')
    .populate('seller', 'businessName slug')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  return conversations.filter((c) => {
    const order = c.order as any;
    return order?.chatEnabled;
  });
};

export const getSellerConversations = async (userId: string) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) return [];

  const conversations = await Conversation.find({ seller: profile._id })
    .populate('order', 'orderNumber status total items createdAt chatEnabled')
    .populate('buyer', 'name email')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  return conversations.filter((c) => {
    const order = c.order as any;
    return order?.chatEnabled;
  });
};

export const getConversationMessages = async (conversationId: string, userId: string) => {
  const conversation = await Conversation.findById(conversationId)
    .populate('seller', 'user businessName')
    .populate('buyer', 'name email');

  if (!conversation) throw new Error('Conversación no encontrada');

  const seller = conversation.seller as any;
  const isBuyer = String(conversation.buyer) === userId;
  const isSeller = seller?.user && String(seller.user) === userId;

  if (!isBuyer && !isSeller) throw new Error('Acceso denegado');

  const order = await MarketplaceOrder.findById(conversation.order);
  if (!order?.chatEnabled) throw new Error('El chat no está habilitado para este pedido');

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
  const isBuyer = String(conversation.buyer) === userId;
  const isSeller = seller?.user && String(seller.user) === userId;
  if (!isBuyer && !isSeller) throw new Error('Acceso denegado');

  const order = await MarketplaceOrder.findById(conversation.order);
  if (!order?.chatEnabled) throw new Error('El chat no está habilitado para este pedido');

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
  const order = await MarketplaceOrder.findOne({ orderNumber });
  if (!order) throw new Error('Pedido no encontrado');
  if (!order.chatEnabled) throw new Error('Chat no disponible');

  const isBuyer = order.buyer && String(order.buyer) === userId;
  let isSeller = false;
  if (!isBuyer) {
    const profile = await SellerProfile.findOne({ user: userId });
    if (profile) {
      isSeller = order.items.some((i) => String(i.seller) === String(profile._id));
    }
  }

  if (!isBuyer && !isSeller) throw new Error('Acceso denegado');

  let conversation = await Conversation.findOne({ order: order._id });
  if (!conversation && isBuyer) {
    const sellerId = order.items[0]?.seller;
    conversation = await Conversation.create({
      order: order._id,
      buyer: order.buyer,
      seller: sellerId,
      lastMessageAt: new Date(),
    });
  }

  if (!conversation) throw new Error('Conversación no encontrada');

  return getConversationMessages(String(conversation._id), userId);
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
