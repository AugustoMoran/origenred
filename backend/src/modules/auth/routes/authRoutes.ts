import { Router } from 'express';
import { 
  registerController, 
  loginController, 
  logoutController, 
  refreshController, 
  getUsersController, 
  deleteUserController,
  updatePermissionsController,
  updateCommissionController,
  updateBranchController,
} from '../controllers/authController';
import { authenticate, authorize } from '../../../middleware/authMiddleware';
import { User } from '../models/User';

const router = Router();

// Special middleware for register: Allow if first user OR if requester is Admin
const canRegister = async (req: any, res: any, next: any) => {
  const count = await User.countDocuments();
  if (count === 0) return next();
  
  return authenticate(req, res, () => {
    return authorize('admin')(req, res, next);
  });
};

router.post('/register', canRegister, registerController);
router.get('/users', authenticate, authorize('admin'), getUsersController);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUserController);
router.patch('/users/permissions', authenticate, authorize('admin'), updatePermissionsController);
router.patch('/users/commission', authenticate, authorize('admin'), updateCommissionController);
router.patch('/users/branch', authenticate, authorize('admin'), updateBranchController);
router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);

export default router;
