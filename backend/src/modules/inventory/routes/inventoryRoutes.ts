import { Router } from 'express';
import { 
  getProductsController, 
  createProductController, 
  updateProductController, 
  deleteProductController,
  adjustStockController,
  bulkCostUpdateController,
  resyncMarketplaceController,
} from '../controllers/inventoryController';
import { authenticate, authorize } from '../../../middleware/authMiddleware';
import { inventoryProductUpload } from '../middleware/inventoryUpload';
import { PERMISSIONS } from '../../auth/constants/permissions';
import { Request, Response, NextFunction } from 'express';

const router = Router();

const optionalProductUpload = (req: Request, res: Response, next: NextFunction) => {
  inventoryProductUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'galleryImages', maxCount: 10 },
  ])(req, res, (err: any) => {
    if (err) {
      console.warn('No se pudieron subir imágenes, se guardará el producto sin fotos nuevas:', err?.message || err);
      return next();
    }
    return next();
  });
};

// Todos los usuarios autenticados con permiso de ver pueden listar
router.get('/', authenticate, authorize(PERMISSIONS.INVENTORY_VIEW), getProductsController);

// Solo usuarios con permiso de edición pueden crear/modificar
router.post('/', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), optionalProductUpload, createProductController);
router.put('/:id', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), optionalProductUpload, updateProductController);
router.delete('/:id', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), deleteProductController);

// Ajuste rápido de stock (entradas/salidas)
router.patch('/:id/stock', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), adjustStockController);
router.post('/bulk/cost-update', authenticate, authorize(PERMISSIONS.INVENTORY_EDIT), bulkCostUpdateController);
router.post('/sync-marketplace', authenticate, resyncMarketplaceController);

export default router;
