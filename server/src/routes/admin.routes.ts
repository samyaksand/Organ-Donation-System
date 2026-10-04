import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/overview', admin.overview);

export default router;
