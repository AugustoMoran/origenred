import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  isActive: boolean;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>('Category', CategorySchema);
