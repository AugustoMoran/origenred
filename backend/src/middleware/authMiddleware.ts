import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_ACCESS_TOKEN_SECRET } from '../config';
import { User } from '../modules/auth/models/User';

const extractAccessToken = (req: Request): string | null => {
  const auth = req.headers.authorization;
  if (auth) {
    const parts = auth.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }

  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) return res.status(401).json({ message: 'Missing auth' });

  try {
    const payload: any = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/** Sets req.user when a valid token is present; continues without auth otherwise. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) return next();

  try {
    const payload: any = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET);
    const user = await User.findById(payload.sub);
    if (user) (req as any).user = user;
  } catch {
    // ignore invalid tokens for optional auth
  }

  next();
}

export function authorize(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    // Admin has full access
    if (user.roles.includes('admin')) return next();

    const perms = user.permissions || {};
    if (perms[permission] === true) return next();
    
    return res.status(403).json({ message: 'Forbidden' });
  };
}
