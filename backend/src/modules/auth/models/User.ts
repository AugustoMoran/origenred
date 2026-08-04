import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  roles: string[];
  permissions: Record<string, boolean>;
  commissionRate: number; // Porcentaje de comisión
  branch: Schema.Types.ObjectId; // Sucursal asignada
  refreshTokens: { token: string; createdAt: Date }[];
  pushTokens?: Array<{ token: string; platform?: string; updatedAt: Date }>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    roles: { type: [String], default: ['vendedor'] },
    permissions: { type: Schema.Types.Mixed, default: {} },
    commissionRate: { type: Number, default: 0 },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    refreshTokens: [
      {
        token: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    pushTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
