import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus } from '../constants/roles';

export interface IOrderItem {
  listing: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  subtotal: number;
}

export interface IMarketplaceOrder extends Document {
  orderNumber: string;
  buyer?: mongoose.Types.ObjectId;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  items: IOrderItem[];
  subtotal: number;
  shippingTotal: number;
  commissionTotal: number;
  commissionPercent: number;
  total: number;
  status: OrderStatus;
  paymentId?: string;
  paymentStatus?: string;
  mercadoPagoPreferenceId?: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    notes?: string;
  };
  shippingMethod?: 'delivery' | 'pickup';
  shippingBySeller?: Array<{
    seller: mongoose.Types.ObjectId;
    sellerName: string;
    shippingCost: number;
    status?: 'processing' | 'shipped' | 'delivered';
    trackingCode?: string;
    shippedAt?: Date;
  }>;
  envioPackShipmentId?: string;
  trackingCode?: string;
  chatEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
    title: { type: String, required: true },
    slug: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    imageUrl: { type: String },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const MarketplaceOrderSchema = new Schema<IMarketplaceOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    guestEmail: { type: String, trim: true, lowercase: true },
    guestName: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    shippingTotal: { type: Number, default: 0 },
    commissionTotal: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 5 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending_payment',
      index: true,
    },
    paymentId: { type: String },
    paymentStatus: { type: String },
    mercadoPagoPreferenceId: { type: String },
    shippingAddress: {
      fullName: String,
      phone: String,
      street: String,
      city: String,
      province: String,
      postalCode: String,
      notes: String,
    },
    shippingMethod: { type: String, enum: ['delivery', 'pickup'] },
    shippingBySeller: [
      {
        seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile' },
        sellerName: String,
        shippingCost: { type: Number, default: 0 },
        status: { type: String, enum: ['processing', 'shipped', 'delivered'], default: 'processing' },
        trackingCode: String,
        shippedAt: Date,
      },
    ],
    envioPackShipmentId: { type: String },
    trackingCode: { type: String },
    chatEnabled: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export const MarketplaceOrder = mongoose.model<IMarketplaceOrder>(
  'MarketplaceOrder',
  MarketplaceOrderSchema
);
