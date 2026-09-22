export const chatSenderId = (msg: { sender?: { _id?: string; id?: string } | string }) => {
  if (!msg.sender) return '';
  if (typeof msg.sender === 'string') return msg.sender;
  return String(msg.sender._id || msg.sender.id || '');
};

export const formatChatTime = (value: string | Date) =>
  new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatChatReadLabel = (readAt?: string | Date | null): string | null => {
  if (!readAt) return null;
  return `Visto ${formatChatTime(readAt)}`;
};

export type ChatReadPayload = {
  conversationId: string;
  readerId: string;
  readAt: string;
  messageIds: string[];
};

export const applyChatReadToMessages = <T extends { _id: string; readAt?: string }>(
  messages: T[],
  payload: ChatReadPayload
): T[] => {
  if (!payload.messageIds.length) return messages;
  const ids = new Set(payload.messageIds);
  return messages.map((m) => (ids.has(m._id) ? { ...m, readAt: payload.readAt } : m));
};
