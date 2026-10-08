import { Router } from 'express';
import * as analytics from '../controllers/analytics.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditedAccess } from '../security/middleware';
import { analyticsWindowQuery, trendsQuery } from '../schemas/analytics.schema';

const router = Router();

// Admin or Super Admin only. Never public, never donor-accessible: these are aggregated
// operational figures, not sensitive in themselves, but the access boundary matches every
// other admin-only endpoint in the API rather than introducing a new exposure surface.
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), auditedAccess('admin-analytics', 'VIEW'));

router.get('/overview', analytics.overview);
router.get('/donors', validate({ query: analyticsWindowQuery }), analytics.donors);
router.get('/organs', analytics.organs);
router.get('/hospitals', analytics.hospitals);
router.get('/withdrawals', validate({ query: analyticsWindowQuery }), analytics.withdrawals);
router.get('/organ-requests', validate({ query: analyticsWindowQuery }), analytics.organRequests);
router.get('/trends', validate({ query: trendsQuery }), analytics.trends);

export default router;
