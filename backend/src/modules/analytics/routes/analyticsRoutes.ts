import { Router } from 'express';
import {
  getOverviewAnalyticsController,
  getEcommerceAnalyticsController,
} from '../controllers/analyticsController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate, authorize(['admin']));

router.get('/overview', getOverviewAnalyticsController);
router.get('/ecommerce', getEcommerceAnalyticsController);

export default router;
