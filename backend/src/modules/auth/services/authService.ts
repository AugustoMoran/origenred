import bcrypt from 'bcrypt';
import { User, IUser } from '../models/User';
import * as tokenService from './tokenService';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function register(
  email: string,
  password: string,
  roles: string[] = ['vendedor'],
  permissions: Record<string, boolean> = {},
  name?: string,
  branch?: string,
  commissionRate?: number
) {
  const normalizedEmail = normalizeEmail(email);
  const hash = await bcrypt.hash(password, 10);
  
  // Check if this is the first user
  const userCount = await User.countDocuments();
  const finalRoles = userCount === 0 ? ['admin'] : roles;
  
  const user = await User.create({ 
    name: name || normalizedEmail.split('@')[0], 
    email: normalizedEmail,
    password: hash, 
    roles: finalRoles,
    permissions,
    branch: branch || undefined,
    commissionRate: Number.isFinite(Number(commissionRate)) ? Number(commissionRate) : 0,
  });
  return user;
}

export async function validateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  // Fast path for normalized records
  let user = await User.findOne({ email: normalizedEmail });

  // Backward compatibility for legacy records stored with mixed-case emails
  if (!user) {
    user = await User.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' },
    });
  }

  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  return ok ? user : null;
}

export { tokenService };
