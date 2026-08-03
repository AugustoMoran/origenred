import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  user: mongoose.Types.ObjectId;
  listing: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

FavoriteSchema.index({ user: 1, listing: 1 }, { unique: true });

export const Favorite = mongoose.model<IFavorite>('Favorite', FavoriteSchema);
