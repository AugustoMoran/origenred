import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

const SupplierSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    contactName: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
