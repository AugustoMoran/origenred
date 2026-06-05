import { Router } from 'express';
import * as supplierController from '../controllers/supplierController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', supplierController.getSuppliers);
router.post('/', authorize(['admin']), supplierController.createSupplier);
router.put('/:id', authorize(['admin']), supplierController.updateSupplier);
router.delete('/:id', authorize(['admin']), supplierController.deleteSupplier);

export default router;
