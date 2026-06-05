import { Router } from 'express';
import { 
  getProductsController, 
  createProductController, 
  updateProductController, 
  deleteProductController,
  adjustStockController,
  bulkCostUpdateController
} from '../controllers/inventoryController';
import { authenticate, authorize } from '../../../middleware/authMiddleware';
import { upload } from '../../../middleware/uploadMiddleware';
import { PERMISSIONS } from '../../auth/constants/permissions';
import { Request, Response, NextFunction } from 'express';

const router = Router();

const optionalImageUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      console.warn('No se pudo subir la imagen, se guardará el producto sin foto:', err?.message || err);
      return next();
    }
    return next();
  });
};

// Todos los usuarios autenticados con permiso de ver pueden listar
router.get('/', authenticate, authorize(PERMISSIONS.INVENTORY_VIEW), getProductsController);

// Solo usuarios con permiso de edición pueden crear/modificar
router.post('/', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), optionalImageUpload, createProductController);
router.put('/:id', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), optionalImageUpload, updateProductController);
router.delete('/:id', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), deleteProductController);

// Ajuste rápido de stock (entradas/salidas)
router.patch('/:id/stock', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), adjustStockController);
router.post('/bulk/cost-update', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), bulkCostUpdateController);

export default router;
