import mongoose, { Schema, Document } from 'mongoose';

export enum MovementType {
  SALE = 'SALE',
  RETURN = 'RETURN',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT'
}

export interface IStockMovement extends Document {
  product: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  type: MovementType;
  quantity: number;
  previousStock: number;
  currentStock: number;
  user: mongoose.Types.ObjectId;
  reference?: string; // ID de Venta, Transferencia, etc.
  notes?: string;
  createdAt: Date;
}

const StockMovementSchema: Schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  type: { type: String, enum: Object.values(MovementType), required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  currentStock: { type: Number, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reference: { type: String },
  notes: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);