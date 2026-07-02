import { Router } from 'express';
import { getTaxpayerController, getAfipStatusController } from '../controllers/afipController';
import { authenticate } from '../../../middleware/authMiddleware';

const router = Router();

// Consulta de padrón (CUIT)
router.get('/taxpayer/:cuit', authenticate, getTaxpayerController);

// Status / Points of Sale
router.get('/status', authenticate, getAfipStatusController);

export default router;
