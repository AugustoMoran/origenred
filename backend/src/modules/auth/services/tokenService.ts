import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_ACCESS_TOKEN_SECRET, JWT_REFRESH_TOKEN_SECRET } from '../../../config';
import { IUser, User } from '../models/User';

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '30d';

export function signAccessToken(user: IUser) {
  return jwt.sign({ sub: user.id, roles: user.roles, permissions: user.permissions }, JWT_ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(user: IUser) {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ sub: user.id, jti }, JWT_REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_TOKEN_SECRET) as { sub: string; iat: number; exp: number };
}

export async function rotateRefreshToken(userId: string, oldToken: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const foundIdx = user.refreshTokens.findIndex((r: any) => r.token === oldToken);
  if (foundIdx === -1) {
    // token reuse detected or token was already removed
    // revoke all
    user.refreshTokens = [] as any;
    user.markModified('refreshTokens');
    await user.save({ validateBeforeSave: false });
    throw new Error('Refresh token reuse detected');
  }

  // remove old and add new
  user.refreshTokens.splice(foundIdx, 1);
  const newToken = signRefreshToken(user as IUser);
  user.refreshTokens.push({ token: newToken, createdAt: new Date() });
  user.markModified('refreshTokens');
  await user.save({ validateBeforeSave: false });
  return newToken;
}

export async function revokeRefreshToken(userId: string, token?: string) {
  const user = await User.findById(userId);
  if (!user) return;
  if (token) {
    const foundIdx = user.refreshTokens.findIndex((r: any) => r.token === token);
    if (foundIdx !== -1) {
      user.refreshTokens.splice(foundIdx, 1);
    }
  } else {
    user.refreshTokens = [] as any;
  }
  user.markModified('refreshTokens');
  await user.save({ validateBeforeSave: false });
}
