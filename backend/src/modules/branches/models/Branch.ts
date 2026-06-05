import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  address: string;
  phone?: string;
  isActive: boolean;
  isMain: boolean;
}

const BranchSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
  isMain: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IBranch>('Branch', BranchSchema);