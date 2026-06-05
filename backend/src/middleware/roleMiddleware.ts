import { Request, Response, NextFunction } from 'express';

export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userRoles: string[] = user.roles || [];
    const isAllowed = roles.some((role) => userRoles.includes(role));

    if (!isAllowed) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}
