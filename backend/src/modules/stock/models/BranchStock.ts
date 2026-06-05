import mongoose, { Schema, Document } from 'mongoose';

export interface IBranchStock extends Document {
  product: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  stock: number;
  minStock: number;
  location?: string; // Pasillo, estante, etc.
}

const BranchStockSchema: Schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  stock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 },
  location: { type: String },
}, { timestamps: true });

// Único stock por producto/sucursal
BranchStockSchema.index({ product: 1, branch: 1 }, { unique: true });

export default mongoose.model<IBranchStock>('BranchStock', BranchStockSchema);