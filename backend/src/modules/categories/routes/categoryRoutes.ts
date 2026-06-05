import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', authorize(['admin']), categoryController.createCategory);
router.put('/:id', authorize(['admin']), categoryController.updateCategory);
router.delete('/:id', authorize(['admin']), categoryController.deleteCategory);

export default router;
