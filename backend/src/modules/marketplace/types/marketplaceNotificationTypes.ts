export type MarketplaceNotificationItem = {
  id: string;
  type: 'chat' | 'order' | 'return' | 'enviopack';
  title: string;
  body: string;
  href: string;
  at: string;
  unread?: boolean;
  orderNumber?: string;
};
