import mongoose, { Schema, Document } from 'mongoose';

export type ReturnRequestStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

export interface IReturnRequest extends Document {
  order: mongoose.Types.ObjectId;
  orderNumber: string;
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: ReturnRequestStatus;
  sellerNote?: string;
  adminNote?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'MarketplaceOrder', required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    reason: { type: String, required: true },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'refunded'],
      default: 'pending',
      index: true,
    },
    sellerNote: { type: String, maxlength: 1000 },
    adminNote: { type: String, maxlength: 1000 },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false }
);

ReturnRequestSchema.index({ order: 1, buyer: 1 }, { unique: true });

export const ReturnRequest = mongoose.model<IReturnRequest>('MarketplaceReturnRequest', ReturnRequestSchema);
