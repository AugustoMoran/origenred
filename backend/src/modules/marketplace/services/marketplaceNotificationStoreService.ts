import { MarketplaceNotification, PersistedNotificationType } from '../models/MarketplaceNotification';
import { MarketplaceNotificationItem } from '../types/marketplaceNotificationTypes';

const sinceDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

export const createMarketplaceNotification = async (input: {
  userId: string;
  type: PersistedNotificationType;
  title: string;
  body: string;
  href: string;
  orderNumber?: string;
  referenceKey?: string;
}) => {
  if (input.referenceKey) {
    const existing = await MarketplaceNotification.findOne({
      user: input.userId,
      referenceKey: input.referenceKey,
    });
    if (existing) {
      existing.title = input.title;
      existing.body = input.body;
      existing.href = input.href;
      existing.orderNumber = input.orderNumber;
      existing.readAt = undefined;
      await existing.save();
      return existing;
    }
  }

  return MarketplaceNotification.create({
    user: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    orderNumber: input.orderNumber,
    referenceKey: input.referenceKey,
  });
};

export const listPersistedNotifications = async (
  userId: string,
  days = 30
): Promise<MarketplaceNotificationItem[]> => {
  const since = sinceDays(days);
  const rows = await MarketplaceNotification.find({
    user: userId,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(40);

  return rows.map((row) => ({
    id: `persisted-${row._id}`,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    at: row.createdAt.toISOString(),
    orderNumber: row.orderNumber,
    unread: !row.readAt,
  }));
};

export const countUnreadPersistedNotifications = (userId: string) =>
  MarketplaceNotification.countDocuments({ user: userId, readAt: { $exists: false } });

export const markNotificationRead = async (userId: string, notificationId: string) => {
  const id = notificationId.replace(/^persisted-/, '');
  const row = await MarketplaceNotification.findOne({ _id: id, user: userId });
  if (!row) throw new Error('Notificación no encontrada');
  if (!row.readAt) {
    row.readAt = new Date();
    await row.save();
  }
  return row;
};

export const markAllNotificationsRead = async (userId: string) => {
  await MarketplaceNotification.updateMany(
    { user: userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  );
};
