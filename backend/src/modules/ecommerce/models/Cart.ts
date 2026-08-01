import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  name: string;
  slug?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface ICart extends Document {
  sessionId?: string;
  user?: mongoose.Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  slug: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  imageUrl: { type: String },
}, { _id: false });

const CartSchema = new Schema({
  sessionId: { type: String, index: true, sparse: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
  items: { type: [CartItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  expiresAt: { type: Date },
}, { timestamps: true, versionKey: false });

CartSchema.index({ updatedAt: 1 });

export default mongoose.model<ICart>('Cart', CartSchema);
