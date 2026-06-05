import { Router } from 'express';
import * as stockController from '../controllers/stockController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

// Listar movimientos (Admin o vendedor)
router.get('/movements', stockController.getStockMovements);

// Ver stock por sucursal de un producto (Admin o vendedor)
router.get('/product/:productId', stockController.getProductStockDetails);

// Ajuste manual (SOLO ADMIN)
router.post('/adjust', authorize(['admin']), stockController.handleManualAdjustment);

export default router;