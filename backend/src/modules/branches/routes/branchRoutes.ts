import { Router } from 'express';
import * as branchController from '../controllers/branchController';
import { authenticate } from '../../../middleware/authMiddleware';
import { authorize } from '../../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', branchController.getBranches);
router.post('/', authorize(['admin']), branchController.createBranch);
router.put('/:id', authorize(['admin']), branchController.updateBranch);
router.delete('/:id', authorize(['admin']), branchController.deleteBranch);

export default router;