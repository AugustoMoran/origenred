export type MarketplaceNotificationItem = {
  id: string;
  type: 'chat' | 'order' | 'return';
  title: string;
  body: string;
  href: string;
  at: string;
  unread?: boolean;
  orderNumber?: string;
};
