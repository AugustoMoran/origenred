import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  description?: string;
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String },
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
  isActive: { type: Boolean, default: true },
}, { 
  timestamps: true,
  versionKey: false 
});

// Índice para búsqueda rápida por nombre, SKU o código de barras
ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
