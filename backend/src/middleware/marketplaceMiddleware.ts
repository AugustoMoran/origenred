import { Request, Response, NextFunction } from 'express';
import { INTERNAL_ROLES, MARKETPLACE_ROLES } from '../modules/marketplace/constants/roles';

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'No autenticado' });

    const userRoles: string[] = user.roles || [];
    if (userRoles.includes(INTERNAL_ROLES.ADMIN)) return next();

    const allowed = roles.some((role) => userRoles.includes(role));
    if (!allowed) return res.status(403).json({ message: 'Acceso denegado' });

    next();
  };
}

export const requireAdmin = requireRoles(INTERNAL_ROLES.ADMIN);
export const requireSeller = requireRoles(MARKETPLACE_ROLES.SELLER);
export const requireBuyer = requireRoles(MARKETPLACE_ROLES.BUYER, MARKETPLACE_ROLES.SELLER);
