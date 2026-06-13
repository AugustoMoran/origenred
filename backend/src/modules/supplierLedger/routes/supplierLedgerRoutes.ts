import { Router } from 'express';
import {
  getLedgerEntriesController,
  getBalanceBySupplierController,
  createLedgerEntryController,
  updateLedgerEntryController,
  deleteLedgerEntryController,
} from '../controllers/supplierLedgerController';
import { authenticate, authorize } from '../../../middleware/authMiddleware';
import { PERMISSIONS } from '../../auth/constants/permissions';

const router = Router();

router.get('/entries', authenticate, authorize(PERMISSIONS.REPORTS_VIEW), getLedgerEntriesController);
router.get('/balance-by-supplier', authenticate, authorize(PERMISSIONS.REPORTS_VIEW), getBalanceBySupplierController);
router.post('/entries', authenticate, authorize(PERMISSIONS.SALES_EDIT), createLedgerEntryController);
router.put('/entries/:id', authenticate, authorize(PERMISSIONS.SALES_EDIT), updateLedgerEntryController);
router.delete('/entries/:id', authenticate, authorize(PERMISSIONS.SALES_EDIT), deleteLedgerEntryController);

export default router;
