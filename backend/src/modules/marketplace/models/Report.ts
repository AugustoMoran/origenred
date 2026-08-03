import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  listing?: mongoose.Types.ObjectId;
  seller?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolvedBy?: mongoose.Types.ObjectId;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing' },
    seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile' },
    order: { type: Schema.Types.ObjectId, ref: 'MarketplaceOrder' },
    reason: { type: String, required: true },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolution: { type: String },
  },
  { timestamps: true, versionKey: false }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);
