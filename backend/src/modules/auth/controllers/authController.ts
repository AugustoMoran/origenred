import { Request, Response } from 'express';
import { register, validateUser, tokenService } from '../services/authService';
import { User } from '../models/User';
import Branch from '../../branches/models/Branch';
import { io } from '../../../app';

const buildRefreshCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: (isProd ? 'none' : 'strict') as 'none' | 'strict',
    secure: isProd,
    path: '/api/auth/refresh',
  };
};

export async function registerController(req: Request, res: Response) {
  const { email, password, roles, permissions, name, branch, commissionRate } = req.body;
  
  // Note: authRoutes will protect this with 'admin' authorization or check for first user
  const user = await register(email, password, roles, permissions, name, branch, commissionRate);
  res.json({ id: user.id, name: user.name, email: user.email, roles: user.roles, permissions: user.permissions, branch: user.branch, commissionRate: user.commissionRate });
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

  // store refresh for rotation
  user.refreshTokens.push({ token: refresh, createdAt: new Date() });
  user.markModified('refreshTokens');
  await user.save({ validateBeforeSave: false });

  const refreshCookieOptions = buildRefreshCookieOptions();
  res.cookie('refreshToken', refresh, refreshCookieOptions);
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
      res.clearCookie('refreshToken', buildRefreshCookieOptions());
      return res.status(401).json({ message: 'Refresh token reuse detected' });
    }

    const access = tokenService.signAccessToken(user as any);
    res.cookie('refreshToken', newRefresh, buildRefreshCookieOptions());
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
  res.clearCookie('refreshToken', buildRefreshCookieOptions());
  res.json({ ok: true });
}
