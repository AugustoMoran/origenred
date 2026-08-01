import { Router } from 'express';
import {
  getOverviewAnalyticsController,
  getEcommerceAnalyticsController,
} from '../controllers/analyticsController';
import { authenticate, authorize } from '../../../middleware/authMiddleware';
import { PERMISSIONS } from '../../auth/constants/permissions';

const router = Router();

router.get('/overview', authenticate, authorize(PERMISSIONS.SALES_VIEW), getOverviewAnalyticsController);
router.get('/ecommerce', authenticate, authorize(PERMISSIONS.SALES_VIEW), getEcommerceAnalyticsController);

export default router;
