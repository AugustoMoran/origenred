import mongoose, { Schema, Document } from 'mongoose';
import { ListingStatus } from '../constants/roles';

export interface IListingImage {
  url: string;
  key?: string;
  alt?: string;
}

export interface IListingDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: string;
}

export interface IListing extends Document {
  seller: mongoose.Types.ObjectId;
  inventoryProductId?: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  stock: number;
  category: mongoose.Types.ObjectId;
  brand?: string;
  color?: string;
  size?: string;
  condition: 'new' | 'used' | 'refurbished';
  images: IListingImage[];
  weight?: number;
  dimensions?: IListingDimensions;
  freeShipping: boolean;
  allowPickup: boolean;
  province?: string;
  city?: string;
  postalCode?: string;
  status: ListingStatus;
  origenRankScore: number;
  views: number;
  salesCount: number;
  seoTitle?: string;
  seoDescription?: string;
  moderated: boolean;
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ListingImageSchema = new Schema(
  {
    url: { type: String, required: true },
    key: { type: String },
    alt: { type: String },
  },
  { _id: false }
);

const ListingDimensionsSchema = new Schema(
  {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: 'cm' },
  },
  { _id: false }
);

const ListingSchema = new Schema<IListing>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    inventoryProductId: { type: Schema.Types.ObjectId, ref: 'Product', sparse: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 300 },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'ARS' },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'MarketplaceCategory', required: true, index: true },
    brand: { type: String, trim: true, index: true },
    color: { type: String, trim: true },
    size: { type: String, trim: true },
    condition: { type: String, enum: ['new', 'used', 'refurbished'], default: 'new' },
    images: { type: [ListingImageSchema], default: [] },
    weight: { type: Number },
    dimensions: { type: ListingDimensionsSchema },
    freeShipping: { type: Boolean, default: false },
    allowPickup: { type: Boolean, default: false },
    province: { type: String, trim: true, index: true },
    city: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'sold_out', 'moderated'],
      default: 'draft',
      index: true,
    },
    origenRankScore: { type: Number, default: 0, index: true },
    views: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    seoTitle: { type: String },
    seoDescription: { type: String },
    moderated: { type: Boolean, default: false },
    moderationReason: { type: String },
  },
  { timestamps: true, versionKey: false }
);

ListingSchema.index({ title: 'text', description: 'text', brand: 'text' });
ListingSchema.index({ status: 1, origenRankScore: -1 });
ListingSchema.index({ status: 1, createdAt: -1 });
ListingSchema.index({ status: 1, salesCount: -1 });

export const Listing = mongoose.model<IListing>('Listing', ListingSchema);
