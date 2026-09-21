import mongoose, { Schema, Document } from 'mongoose';
import { SellerStatus } from '../constants/roles';

export interface ISellerProfile extends Document {
  user: mongoose.Types.ObjectId;
  businessName: string;
  slug: string;
  description?: string;
  status: SellerStatus;
  province?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  shipStreet?: string;
  shipCity?: string;
  shipProvince?: string;
  shipPostalCode?: string;
  /** ID depósito en EnvíoPack (Configuración > Depósitos). Se autocompleta por CP si coincide. */
  envioPackDireccionEnvioId?: number;
  /** Solo cuentas marketplace EnvíoPack: empresa del seller asociado. */
  envioPackEmpresaId?: number;
  mercadoPagoUserId?: string;
  mercadoPagoConnected: boolean;
  reputationScore: number;
  totalSales: number;
  responseTimeHours?: number;
  listingCount: number;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SellerProfileSchema = new Schema<ISellerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'suspended', 'rejected'],
      default: 'pending',
      index: true,
    },
    province: { type: String, trim: true },
    city: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    phone: { type: String, trim: true },
    shipStreet: { type: String, trim: true },
    shipCity: { type: String, trim: true },
    shipProvince: { type: String, trim: true },
    shipPostalCode: { type: String, trim: true },
    envioPackDireccionEnvioId: { type: Number },
    envioPackEmpresaId: { type: Number },
    mercadoPagoUserId: { type: String },
    mercadoPagoConnected: { type: Boolean, default: false },
    reputationScore: { type: Number, default: 0, min: 0, max: 100 },
    totalSales: { type: Number, default: 0 },
    responseTimeHours: { type: Number },
    listingCount: { type: Number, default: 0 },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
  },
  { timestamps: true, versionKey: false }
);

SellerProfileSchema.index({ businessName: 'text', description: 'text' });

export const SellerProfile = mongoose.model<ISellerProfile>('SellerProfile', SellerProfileSchema);
