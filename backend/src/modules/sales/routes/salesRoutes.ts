import { Router } from 'express';
import {
	getSalesController,
	createSaleController,
	downloadInvoiceController,
	downloadRemitoController,
	getProfitReportController,
	getSaleByIdController,
	updateSaleController,
	deleteSaleController,
	getCreditNotesController,
	createCreditNoteController,
} from '../controllers/salesController';
import { authenticate, authorize } from '../../../middleware/authMiddleware';
import { PERMISSIONS } from '../../auth/constants/permissions';

const router = Router();

router.get('/', authenticate, authorize(PERMISSIONS.SALES_VIEW), getSalesController);
router.get('/profit-report', authenticate, authorize(PERMISSIONS.SALES_VIEW), getProfitReportController);
router.get('/credit-notes', authenticate, authorize(PERMISSIONS.SALES_VIEW), getCreditNotesController);
router.get('/:id/download', authenticate, authorize(PERMISSIONS.SALES_VIEW), downloadInvoiceController);
router.get('/:id/remito', authenticate, authorize(PERMISSIONS.SALES_VIEW), downloadRemitoController);
router.get('/:id', authenticate, authorize(PERMISSIONS.SALES_VIEW), getSaleByIdController);
router.post('/', authenticate, authorize(PERMISSIONS.SALES_EDIT), createSaleController);
router.post('/credit-notes', authenticate, authorize(PERMISSIONS.SALES_EDIT), createCreditNoteController);
router.put('/:id', authenticate, authorize(PERMISSIONS.SALES_EDIT), updateSaleController);
router.delete('/:id', authenticate, authorize(PERMISSIONS.SALES_EDIT), deleteSaleController);

export default router;
