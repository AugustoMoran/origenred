import mongoose, { Schema, Document } from 'mongoose';

export type PersistedNotificationType = 'order' | 'return';

export interface IMarketplaceNotification extends Document {
  user: mongoose.Types.ObjectId;
  type: PersistedNotificationType;
  title: string;
  body: string;
  href: string;
  orderNumber?: string;
  referenceKey?: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MarketplaceNotificationSchema = new Schema<IMarketplaceNotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['order', 'return'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    href: { type: String, required: true },
    orderNumber: { type: String },
    referenceKey: { type: String },
    readAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

MarketplaceNotificationSchema.index({ user: 1, createdAt: -1 });
MarketplaceNotificationSchema.index({ user: 1, referenceKey: 1 }, { unique: true, sparse: true });

export const MarketplaceNotification = mongoose.model<IMarketplaceNotification>(
  'MarketplaceNotification',
  MarketplaceNotificationSchema
);
