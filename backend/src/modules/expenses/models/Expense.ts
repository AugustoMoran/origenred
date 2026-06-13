import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  date: Date;
  description: string;
  amount: number;
  affectsProfit: boolean;
  category?: string;
  branch?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    affectsProfit: { type: Boolean, default: true },
    category: { type: String, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1, isActive: 1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
