import { Router } from 'express';
import { streamMediaObjectController } from '../controllers/mediaController';

const router = Router();

router.get('/*', streamMediaObjectController);

export default router;
