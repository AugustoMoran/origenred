import mongoose, { Schema, Document } from 'mongoose';

export interface IProductGalleryItem {
  url: string;
  publicId?: string;
  alt?: string;
}

export interface IProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: string;
}

export interface IProduct extends Document {
  name: string;
  sku: string;
  slug: string;
  description?: string;
  commercialDescription?: string;
  longDescription?: string;
  price: number;
  costPrice: number;
  iva: number;
  margin: number;
  stock: number;
  minStock: number;
  category: string;
  supplier?: mongoose.Types.ObjectId;
  barcode?: string;
  internalCode?: string;
  imageUrl?: string;
  imagePublicId?: string;
  gallery: IProductGalleryItem[];
  paused: boolean;
  featured: boolean;
  weight?: number;
  dimensions?: IProductDimensions;
  seoTitle?: string;
  seoDescription?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductGallerySchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String },
  },
  { _id: false }
);

const ProductDimensionsSchema = new Schema(
  {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: { type: String, default: 'cm' },
  },
  { _id: false }
);

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  description: { type: String },
  commercialDescription: { type: String },
  longDescription: { type: String },
  price: { type: Number, required: true, default: 0 },
  costPrice: { type: Number, required: true, default: 0 },
  iva: { type: Number, required: true, default: 21 },
  margin: { type: Number, required: true, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 },
  category: { type: String, required: true, trim: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  barcode: { type: String, sparse: true },
  internalCode: { type: String },
  imageUrl: { type: String },
  imagePublicId: { type: String },
  gallery: { type: [ProductGallerySchema], default: [] },
  paused: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  weight: { type: Number },
  dimensions: { type: ProductDimensionsSchema },
  seoTitle: { type: String },
  seoDescription: { type: String },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  versionKey: false,
});

ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text' });
ProductSchema.index({ isActive: 1, paused: 1, displayOrder: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
