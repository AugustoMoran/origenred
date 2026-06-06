import mongoose, { Schema, Document } from 'mongoose';

export interface ICreditNoteItem {
  product: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
}

export interface ICreditNote extends Document {
  sale: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  items: ICreditNoteItem[];
  mode: 'TOTAL' | 'PARTIAL';
  reason: string;
  affectsStock: boolean;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia';
  totalNeto: number;
  totalIva: number;
  total: number;
  costAmount: number; // negativo cuando revierte COGS por devolución física
  invoiceType: 'NC_A' | 'NC_B' | 'NC_C' | 'NC_INTERNAL';
  associatedInvoiceType: 'A' | 'B' | 'C' | 'Ticket' | 'NONE';
  associatedInvoiceNumber: string;
  associatedVoucherNumber?: number;
  cae?: string;
  caeExpiration?: Date;
  voucherNumber?: number;
  billingStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'NONE';
  errorMessage?: string;
  stockRevertedAt?: Date;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: Date;
}

const CreditNoteSchema: Schema = new Schema({
  sale: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  }],
  mode: { type: String, enum: ['TOTAL', 'PARTIAL'], default: 'TOTAL', required: true },
  reason: { type: String, required: true },
  affectsStock: { type: Boolean, default: false },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia'],
    default: 'efectivo',
  },
  totalNeto: { type: Number, required: true },
  totalIva: { type: Number, required: true },
  total: { type: Number, required: true },
  costAmount: { type: Number, required: true, default: 0 },
  invoiceType: { type: String, enum: ['NC_A', 'NC_B', 'NC_C', 'NC_INTERNAL'], required: true },
  associatedInvoiceType: { type: String, enum: ['A', 'B', 'C', 'Ticket', 'NONE'], required: true },
  associatedInvoiceNumber: { type: String, required: true },
  associatedVoucherNumber: { type: Number },
  cae: { type: String },
  caeExpiration: { type: Date },
  voucherNumber: { type: Number },
  billingStatus: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'NONE'],
    default: 'PENDING',
  },
  errorMessage: { type: String },
  stockRevertedAt: { type: Date },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' },
}, {
  timestamps: true,
  versionKey: false,
});

CreditNoteSchema.index({ createdAt: -1 });
CreditNoteSchema.index({ sale: 1, status: 1 });

export default mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);
