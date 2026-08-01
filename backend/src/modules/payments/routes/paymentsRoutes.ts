import { Router } from 'express';
import {
  getMercadoPagoConfigController,
  createPreferenceController,
  mercadoPagoWebhookController,
  getPaymentStatusController,
} from '../controllers/paymentsController';
import { authenticate } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/mercadopago/config', getMercadoPagoConfigController);
router.post('/mercadopago/preference', authenticate, createPreferenceController);
router.post('/mercadopago/webhook', mercadoPagoWebhookController);
router.get('/mercadopago/payment/:paymentId', authenticate, getPaymentStatusController);

export default router;
