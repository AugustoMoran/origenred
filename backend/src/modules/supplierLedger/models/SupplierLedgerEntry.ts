import mongoose, { Schema, Document } from 'mongoose';

export type SupplierLedgerEntryType = 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT';

export interface ISupplierLedgerEntry extends Document {
  date: Date;
  supplier?: mongoose.Types.ObjectId;
  counterpartyName: string;
  reference?: string;
  description?: string;
  entryType: SupplierLedgerEntryType;
  amount: number;
  signedAmount: number;
  createdBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierLedgerEntrySchema: Schema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    counterpartyName: { type: String, trim: true, default: 'Otro' },
    reference: { type: String, trim: true },
    description: { type: String, trim: true },
    entryType: {
      type: String,
      enum: ['INVOICE', 'PAYMENT', 'ADJUSTMENT'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    signedAmount: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SupplierLedgerEntrySchema.index({ supplier: 1, date: -1, isActive: 1 });
SupplierLedgerEntrySchema.index({ counterpartyName: 1, date: -1, isActive: 1 });

export default mongoose.model<ISupplierLedgerEntry>('SupplierLedgerEntry', SupplierLedgerEntrySchema);
