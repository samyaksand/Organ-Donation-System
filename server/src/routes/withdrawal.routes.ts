import { Router } from 'express';
import * as withdrawals from '../controllers/withdrawal.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { createWithdrawalSchema, listWithdrawalsQuery, reviewWithdrawalSchema } from '../schemas/withdrawal.schema';

const router = Router();
router.use(requireAuth);

// Donor
router.get('/mine', requireRole('DONOR'), withdrawals.listMine);
router.post('/', requireRole('DONOR'), validate({ body: createWithdrawalSchema }), withdrawals.create);

// Admin
router.get('/', requireRole('ADMIN', 'SUPER_ADMIN'), validate({ query: listWithdrawalsQuery }), withdrawals.list);
router.patch(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate({ params: idParam, body: reviewWithdrawalSchema }),
  withdrawals.review,
);
router.get('/:id/history', requireRole('ADMIN', 'SUPER_ADMIN'), validate({ params: idParam }), withdrawals.history);

export default router;
