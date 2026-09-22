const CHAT_CLOSED = new Set(['pending_payment', 'cancelled', 'refunded', 'delivered']);
const CHAT_OPEN = new Set(['paid', 'processing', 'shipped']);

export const canShowOrderChat = (order: {
  chatEnabled?: boolean;
  status?: string;
} | null | undefined): boolean => {
  if (!order) return false;
  const status = String(order.status || '');
  if (CHAT_CLOSED.has(status)) return false;
  if (CHAT_OPEN.has(status)) return true;
  return Boolean(order.chatEnabled);
};
