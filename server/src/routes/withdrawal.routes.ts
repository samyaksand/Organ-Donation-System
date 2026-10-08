import { Router, type Request } from 'express';
import * as withdrawals from '../controllers/withdrawal.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { auditedAccess } from '../security/middleware';
import { createWithdrawalSchema, listWithdrawalsQuery, reviewWithdrawalSchema } from '../schemas/withdrawal.schema';

const router = Router();
router.use(requireAuth);
const ownDonorId = (req: Request) => req.auth?.donorId ?? undefined;

// Donor
router.get('/mine', requireRole('DONOR'), auditedAccess('donor-withdrawal', 'VIEW', ownDonorId), withdrawals.listMine);
router.post('/', requireRole('DONOR'), auditedAccess('donor-withdrawal', 'CREATE', ownDonorId), validate({ body: createWithdrawalSchema }), withdrawals.create);

// Admin
router.get('/', requireRole('ADMIN', 'SUPER_ADMIN'), auditedAccess('admin-withdrawal-queue', 'VIEW'), validate({ query: listWithdrawalsQuery }), withdrawals.list);
router.patch(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  auditedAccess('admin-withdrawal-queue', 'REVIEW'),
  validate({ params: idParam, body: reviewWithdrawalSchema }),
  withdrawals.review,
);
router.get('/:id/history', requireRole('ADMIN', 'SUPER_ADMIN'), auditedAccess('admin-withdrawal-queue', 'VIEW'), validate({ params: idParam }), withdrawals.history);

export default router;
