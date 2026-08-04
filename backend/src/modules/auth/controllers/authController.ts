import { Request, Response } from 'express';
import { register, validateUser, tokenService } from '../services/authService';
import { User } from '../models/User';
import Branch from '../../branches/models/Branch';
import { io } from '../../../app';
import {
  clearAuthCookies,
  serializeAuthUser,
  setAuthCookies,
  isMobileClient,
  buildAuthPayload,
} from '../utils/authCookies';

export async function registerController(req: Request, res: Response) {
  const { email, password, roles, permissions, name, branch, commissionRate } = req.body;
  
  // Note: authRoutes will protect this with 'admin' authorization or check for first user
  const user = await register(email, password, roles, permissions, name, branch, commissionRate);
  res.json({ id: user.id, name: user.name, email: user.email, roles: user.roles, permissions: user.permissions, branch: user.branch, commissionRate: user.commissionRate });
}

export async function publicRegisterController(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existing = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const user = await register(String(email), String(password), ['comprador'], {}, name);
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateCommissionController(req: Request, res: Response) {
  const { userId, commissionRate } = req.body;

  const parsedRate = Number(commissionRate);
  if (!Number.isFinite(parsedRate) || parsedRate < 0) {
    return res.status(400).json({ message: 'commissionRate inválido' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.commissionRate = parsedRate;
  await user.save();

  res.json({ message: 'Commission updated successfully', commissionRate: user.commissionRate });
}

export async function updateBranchController(req: Request, res: Response) {
  const { userId, branchId } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (!branchId) {
    user.branch = undefined as any;
    await user.save();
    return res.json({ message: 'Branch unassigned successfully', branch: null });
  }

  const branch = await Branch.findOne({ _id: branchId, isActive: true });
  if (!branch) {
    return res.status(400).json({ message: 'Sucursal inválida o inactiva' });
  }

  user.branch = branch._id as any;
  await user.save();

  return res.json({ message: 'Branch updated successfully', branch: branch._id });
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

export async function deleteUserController(req: Request, res: Response) {
  const targetUserId = String(req.params.id || '');
  const requesterId = String((req as any)?.user?.id || '');

  if (!targetUserId) {
    return res.status(400).json({ message: 'userId requerido' });
  }

  if (targetUserId === requesterId) {
    return res.status(400).json({ message: 'No podés eliminar tu propio usuario' });
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if ((user.roles || []).includes('admin')) {
    return res.status(400).json({ message: 'No se puede eliminar un usuario administrador' });
  }

  await User.findByIdAndDelete(targetUserId);
  return res.json({ message: 'Usuario eliminado correctamente' });
}

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await validateUser(email, password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const access = tokenService.signAccessToken(user as any);
  const refresh = tokenService.signRefreshToken(user as any);

  user.refreshTokens.push({ token: refresh, createdAt: new Date() });
  user.markModified('refreshTokens');
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, access, refresh);
  res.json(buildAuthPayload(user, access, refresh, isMobileClient(req)));
}

export async function getMeController(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ message: 'Not authenticated' });
  res.json(serializeAuthUser(user));
}

export async function refreshController(req: Request, res: Response) {
  const rt = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!rt) return res.status(401).json({ message: 'No refresh token' });

  try {
    const payload: any = tokenService.verifyRefreshToken(rt);
    const userId = payload.sub;

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    let newRefresh;
    try {
      newRefresh = await tokenService.rotateRefreshToken(userId, rt);
    } catch (err) {
      await tokenService.revokeRefreshToken(userId);
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh token reuse detected' });
    }

    const access = tokenService.signAccessToken(user as any);
    setAuthCookies(res, access, newRefresh);
    res.json(buildAuthPayload(user, access, newRefresh, isMobileClient(req)));
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function logoutController(req: Request, res: Response) {
  const rt = req.cookies?.refreshToken || req.body?.refreshToken;
  if (rt) {
    try {
      const payload: any = tokenService.verifyRefreshToken(rt);
      await tokenService.revokeRefreshToken(payload.sub, rt);
    } catch (err) {
      // ignore
    }
  }
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function registerPushTokenController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const { token, platform } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'token requerido' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

  const existing = (user.pushTokens || []).filter((t) => t.token !== token);
  user.pushTokens = [
    ...existing,
    { token, platform: platform || 'unknown', updatedAt: new Date() },
  ] as any;
  user.markModified('pushTokens');
  await user.save({ validateBeforeSave: false });

  res.json({ ok: true, registered: true });
}
