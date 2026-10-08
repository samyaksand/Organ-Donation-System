import { Router } from 'express';
import * as security from '../controllers/security.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditedAccess } from '../security/middleware';
import { analyticsWindowQuery } from '../schemas/analytics.schema';

const router = Router();

// Admin/Super Admin only, same boundary as every other admin endpoint - real security audit
// data (access decisions, AI gateway decisions, policy violations), never fabricated.
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), auditedAccess('security-admin', 'VIEW'));

router.get('/overview', validate({ query: analyticsWindowQuery }), security.overview);
router.get('/decisions', validate({ query: analyticsWindowQuery }), security.decisions);
router.get('/denied', validate({ query: analyticsWindowQuery }), security.denied);
router.get('/violations', validate({ query: analyticsWindowQuery }), security.violations);
router.get('/trends', validate({ query: analyticsWindowQuery }), security.trends);
router.get('/history', validate({ query: analyticsWindowQuery }), security.history);
router.get('/ai-events', validate({ query: analyticsWindowQuery }), security.aiEvents);
router.get('/ai-breakdown', validate({ query: analyticsWindowQuery }), security.aiBreakdown);

export default router;
