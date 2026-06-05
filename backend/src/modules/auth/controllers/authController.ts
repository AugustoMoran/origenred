import { Request, Response } from 'express';
import { register, validateUser, tokenService } from '../services/authService';
import { User } from '../models/User';
import { io } from '../../../app';

export async function registerController(req: Request, res: Response) {
  const { email, password, roles, permissions, name, branch } = req.body;
  
  // Note: authRoutes will protect this with 'admin' authorization or check for first user
  const user = await register(email, password, roles, permissions, name, branch);
  res.json({ id: user.id, name: user.name, email: user.email, roles: user.roles, permissions: user.permissions, branch: user.branch });
}

export async function updatePermissionsController(req: Request, res: Response) {
  const { userId, permissions } = req.body;
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.permissions = permissions;
  user.markModified('permissions');
  await user.save();

  // Notificar por socket para actualización en tiempo real
  if (io) {
    io.to(`user:${userId}`).emit('permissions_updated', user.permissions);
  }

  res.json({ message: 'Permissions updated successfully', permissions: user.permissions });
}

export async function getUsersController(req: Request, res: Response) {
  const users = await User.find({}, '-password -refreshTokens');
  res.json(users);
}

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await validateUser(email, password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const access = tokenService.signAccessToken(user as any);
  const refresh = tokenService.signRefreshToken(user as any);

  // store refresh for rotation
  user.refreshTokens.push({ token: refresh, createdAt: new Date() });
  user.markModified('refreshTokens');
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refresh, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/auth/refresh' });
  res.json({ 
    token: access, 
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      branch: user.branch
    }
  });
}

export async function refreshController(req: Request, res: Response) {
  const rt = req.cookies?.refreshToken;
  if (!rt) return res.status(401).json({ message: 'No refresh token' });

  try {
    const payload: any = tokenService.verifyRefreshToken(rt);
    const userId = payload.sub;

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    // rotate
    let newRefresh;
    try {
      newRefresh = await tokenService.rotateRefreshToken(userId, rt);
    } catch (err) {
      // reuse detected
      await tokenService.revokeRefreshToken(userId);
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Refresh token reuse detected' });
    }

    const access = tokenService.signAccessToken(user as any);
    res.cookie('refreshToken', newRefresh, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/auth/refresh' });
    res.json({ access });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function logoutController(req: Request, res: Response) {
  const rt = req.cookies?.refreshToken;
  if (rt) {
    try {
      const payload: any = tokenService.verifyRefreshToken(rt);
      await tokenService.revokeRefreshToken(payload.sub, rt);
    } catch (err) {
      // ignore
    }
  }
  res.clearCookie('refreshToken');
  res.json({ ok: true });
}
