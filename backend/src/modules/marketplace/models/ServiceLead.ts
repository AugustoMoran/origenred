import mongoose, { Schema, Document } from 'mongoose';

export type ServiceLeadType =
  | 'web_design'
  | 'google_seo'
  | 'meta_ads'
  | 'google_analytics'
  | 'seo';

export type ServiceLeadStatus = 'new' | 'contacted' | 'closed';

export interface IServiceLead extends Document {
  seller: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  serviceType: ServiceLeadType;
  message?: string;
  status: ServiceLeadStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceLeadSchema = new Schema<IServiceLead>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceType: {
      type: String,
      enum: ['web_design', 'google_seo', 'meta_ads', 'google_analytics', 'seo'],
      required: true,
    },
    message: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
      index: true,
    },
    adminNote: { type: String, maxlength: 2000 },
  },
  { timestamps: true, versionKey: false }
);

ServiceLeadSchema.index({ seller: 1, serviceType: 1, status: 1 });

export const ServiceLead = mongoose.model<IServiceLead>('ServiceLead', ServiceLeadSchema);
