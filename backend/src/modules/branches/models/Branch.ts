import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  address: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  isActive: boolean;
  isMain: boolean;
}

const BranchSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  city: { type: String, trim: true },
  province: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, default: 'Argentina', trim: true },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
  isMain: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IBranch>('Branch', BranchSchema);
