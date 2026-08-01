import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreSettings extends Document {
  storeName: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  enableEcommerce: boolean;
  maintenanceMode: boolean;
  minOrderAmount: number;
  freeShippingThreshold: number;
  defaultShippingCost: number;
  mercadopagoEnabled: boolean;
  envioPackEnabled: boolean;
  defaultBranch?: mongoose.Types.ObjectId;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  bannerImages: string[];
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema({
  storeName: { type: String, default: 'Tienda Online' },
  storeDescription: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  enableEcommerce: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  minOrderAmount: { type: Number, default: 0 },
  freeShippingThreshold: { type: Number, default: 0 },
  defaultShippingCost: { type: Number, default: 0 },
  mercadopagoEnabled: { type: Boolean, default: true },
  envioPackEnabled: { type: Boolean, default: false },
  defaultBranch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  socialLinks: {
    instagram: { type: String },
    facebook: { type: String },
    whatsapp: { type: String },
  },
  bannerImages: { type: [String], default: [] },
}, {
  timestamps: { createdAt: false, updatedAt: true },
  versionKey: false,
});

export default mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
