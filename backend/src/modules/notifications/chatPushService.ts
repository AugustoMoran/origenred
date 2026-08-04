import { Conversation } from '../marketplace/models/Chat';
import { User } from '../auth/models/User';
import { sendExpoPush } from './pushNotificationService';

export const notifyChatRecipient = async (
  conversationId: string,
  senderId: string,
  messagePreview: string
) => {
  const conversation = await Conversation.findById(conversationId)
    .populate('seller', 'user businessName')
    .populate('buyer', 'name email');

  if (!conversation) return;

  const seller = conversation.seller as any;
  const buyerId = String(conversation.buyer);
  const sellerUserId = seller?.user ? String(seller.user) : '';

  const recipientId = senderId === buyerId ? sellerUserId : buyerId;
  if (!recipientId) return;

  const user = await User.findById(recipientId);
  const tokens = (user?.pushTokens || []).map((t: { token: string }) => t.token);
  if (!tokens.length) return;

  await sendExpoPush(
    tokens,
    'Nuevo mensaje en OrigenRed',
    messagePreview.slice(0, 120),
    { type: 'chat', conversationId }
  );
};

export const notifyUserPush = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  const user = await User.findById(userId);
  const tokens = (user?.pushTokens || []).map((t: { token: string }) => t.token);
  if (!tokens.length) return;
  await sendExpoPush(tokens, title, body, data);
};
