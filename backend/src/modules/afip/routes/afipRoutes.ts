import { Router } from 'express';
import {
  getTaxpayerController,
  getAfipStatusController,
  getAfipDiagnosticsController,
} from '../controllers/afipController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';

const router = Router();

// Consulta de padrón (CUIT)
router.get('/taxpayer/:cuit', authenticate, getTaxpayerController);

// Status / Points of Sale
router.get('/status', authenticate, getAfipStatusController);

// Diagnóstico de configuración AFIP (solo admin)
router.get('/diagnostics', authenticate, authorize(['admin']), getAfipDiagnosticsController);

export default router;
