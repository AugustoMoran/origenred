import { Response } from 'express';
import { IUser } from '../models/User';

const ACCESS_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const isProd = () => process.env.NODE_ENV === 'production';

export const buildAccessCookieOptions = () => ({
  httpOnly: true,
  sameSite: (isProd() ? 'none' : 'strict') as 'none' | 'strict',
  secure: isProd(),
  path: '/api',
  maxAge: ACCESS_COOKIE_MAX_AGE_MS,
});

export const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: (isProd() ? 'none' : 'strict') as 'none' | 'strict',
  secure: isProd(),
  path: '/api/auth',
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
});

export const serializeAuthUser = (user: IUser | any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  roles: user.roles,
  permissions: user.permissions,
  branch: user.branch,
});

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, buildAccessCookieOptions());
  res.cookie('refreshToken', refreshToken, buildRefreshCookieOptions());
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', buildAccessCookieOptions());
  res.clearCookie('refreshToken', buildRefreshCookieOptions());
};
