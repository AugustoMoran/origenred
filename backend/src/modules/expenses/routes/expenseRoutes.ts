import { Router } from 'express';
import {
  getExpensesController,
  createExpenseController,
  updateExpenseController,
  deleteExpenseController,
} from '../controllers/expenseController';
import { authenticate, authorize } from '../../../middleware/authMiddleware';
import { PERMISSIONS } from '../../auth/constants/permissions';

const router = Router();

router.get('/', authenticate, authorize(PERMISSIONS.REPORTS_VIEW), getExpensesController);
router.post('/', authenticate, authorize(PERMISSIONS.SALES_EDIT), createExpenseController);
router.put('/:id', authenticate, authorize(PERMISSIONS.SALES_EDIT), updateExpenseController);
router.delete('/:id', authenticate, authorize(PERMISSIONS.SALES_EDIT), deleteExpenseController);

export default router;
