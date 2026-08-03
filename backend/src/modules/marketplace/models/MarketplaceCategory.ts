import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketplaceCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent?: mongoose.Types.ObjectId;
  displayOrder: number;
  isActive: boolean;
  listingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MarketplaceCategorySchema = new Schema<IMarketplaceCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String },
    icon: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'MarketplaceCategory' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    listingCount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const MarketplaceCategory = mongoose.model<IMarketplaceCategory>(
  'MarketplaceCategory',
  MarketplaceCategorySchema
);
