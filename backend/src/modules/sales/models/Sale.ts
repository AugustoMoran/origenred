import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number; // Precio de venta al momento de la transacción
  costPrice: number; // Para cálculo de rentabilidad
  ivaRate: number; // e.g. 21, 10.5
  subtotal: number;
}

export interface ISale extends Document {
  items: ISaleItem[];
  totalNeto: number; // Suma de subtotales sin IVA
  totalIva: number; // Suma de los IVAs
  total: number; // Total final
  discountType?: 'NONE' | 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount?: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia';
  invoiceType: 'A' | 'B' | 'C' | 'Ticket' | 'NONE'; // Factura AFIP o venta no fiscal
  invoiceNumber: string; // Formato 00001-00000001
  remitoNumber?: string;
  clientName?: string;
  clientCuit?: string;
  clientAddress?: string;
  cae?: string; // Código de Autorización Electrónico
  caeExpiration?: Date;
  voucherNumber?: number;
  billingStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'NONE';
  errorMessage?: string;
  seller: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  sellerCommissionRate: number; // Snapshot al momento de venta
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  createdAt: Date;
}

const SaleSchema: Schema = new Schema({
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    ivaRate: { type: Number, required: true, default: 21 },
    subtotal: { type: Number, required: true }
  }],
  totalNeto: { type: Number, required: true },
  totalIva: { type: Number, required: true },
  total: { type: Number, required: true },
  discountType: {
    type: String,
    enum: ['NONE', 'PERCENTAGE', 'FIXED'],
    default: 'NONE'
  },
  discountValue: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  paymentMethod: { 
    type: String, 
    enum: ['efectivo', 'tarjeta', 'transferencia'], 
    default: 'efectivo' 
  },
  invoiceType: { 
    type: String, 
    enum: ['A', 'B', 'C', 'Ticket', 'NONE'], 
    default: 'NONE' 
  },
  invoiceNumber: { type: String },
  remitoNumber: { type: String },
  clientName: { type: String },
  clientCuit: { type: String },
  clientAddress: { type: String },
  cae: { type: String },
  caeExpiration: { type: Date },
  voucherNumber: { type: Number },
  billingStatus: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'NONE'], 
    default: 'NONE' 
  },
  errorMessage: { type: String },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  sellerCommissionRate: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['COMPLETED', 'CANCELLED', 'REFUNDED'], 
    default: 'COMPLETED' 
  }
}, { 
  timestamps: true,
  versionKey: false 
});

// Índice para reportes por fecha
SaleSchema.index({ createdAt: -1 });

export default mongoose.model<ISale>('Sale', SaleSchema);
