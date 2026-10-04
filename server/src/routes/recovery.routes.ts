import { Router } from 'express';
import * as recovery from '../controllers/recovery.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// SUPER_ADMIN only. Deliberately not ('ADMIN', 'SUPER_ADMIN') like the other admin routes:
// a regular ADMIN must get the same 403 FORBIDDEN a donor would, not a narrower "not found".
router.use(requireAuth, requireRole('SUPER_ADMIN'));

router.get('/status', recovery.status);
router.post('/snapshot', recovery.snapshot);
router.post('/restore', recovery.restore);

export default router;
