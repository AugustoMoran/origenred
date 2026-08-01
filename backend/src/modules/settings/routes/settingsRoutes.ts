import { Router } from 'express';
import {
  getPublicSettingsController,
  getSettingsController,
  updateSettingsController,
  uploadBannerImagesController,
  clearBannerImagesController,
} from '../controllers/settingsController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';
import { bannerUpload } from '../../../middleware/uploadMiddleware';

const router = Router();

router.get('/public', getPublicSettingsController);
router.get('/', authenticate, authorize(['admin']), getSettingsController);
router.put('/', authenticate, authorize(['admin']), updateSettingsController);
router.post(
  '/banners',
  authenticate,
  authorize(['admin']),
  bannerUpload.array('banners', 10),
  uploadBannerImagesController
);
router.delete('/banners', authenticate, authorize(['admin']), clearBannerImagesController);

export default router;
