import { Router } from 'express';
import {
  getPublicSettingsController,
  getSettingsController,
  updateSettingsController,
} from '../controllers/settingsController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';

const router = Router();

router.get('/public', getPublicSettingsController);
router.get('/', authenticate, authorize(['admin']), getSettingsController);
router.put('/', authenticate, authorize(['admin']), updateSettingsController);

export default router;
