import { Router } from 'express';
import {
  getShippingMethodsController,
  quoteShippingController,
} from '../controllers/shippingController';

const router = Router();

router.get('/methods', getShippingMethodsController);
router.post('/quote', quoteShippingController);

export default router;
