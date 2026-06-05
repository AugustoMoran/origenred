import bcrypt from 'bcrypt';
import { User, IUser } from '../models/User';
import * as tokenService from './tokenService';

export async function register(
  email: string,
  password: string,
  roles: string[] = ['vendedor'],
  permissions: Record<string, boolean> = {},
  name?: string,
  branch?: string
) {
  const hash = await bcrypt.hash(password, 10);
  
  // Check if this is the first user
  const userCount = await User.countDocuments();
  const finalRoles = userCount === 0 ? ['admin'] : roles;
  
  const user = await User.create({ 
    name: name || email.split('@')[0], 
    email, 
    password: hash, 
    roles: finalRoles,
    permissions,
    branch: branch || undefined,
  });
  return user;
}

export async function validateUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  return ok ? user : null;
}

export { tokenService };
