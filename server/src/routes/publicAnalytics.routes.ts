import { Router } from 'express';
import * as publicAnalytics from '../controllers/publicAnalytics.controller';
import { publicRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { auditedAccess } from '../security/middleware';
import { analyticsWindowQuery, trendsQuery } from '../schemas/analytics.schema';

const router = Router();

// Unauthenticated by design - see services/publicAnalytics.service.ts for the aggregate-only
// boundary this exposes. Never add an admin-only field here (donor identity, individual
// withdrawal/organ-request records, workflow history).
router.use(publicRateLimiter, auditedAccess('public-analytics', 'VIEW'));

router.get('/overview', publicAnalytics.overview);
router.get('/organs', publicAnalytics.organs);
router.get('/hospitals', publicAnalytics.hospitals);
router.get('/concentration', publicAnalytics.concentration);
router.get('/trends', validate({ query: trendsQuery }), publicAnalytics.trends);
router.get('/breaches', validate({ query: analyticsWindowQuery }), publicAnalytics.breaches);

export default router;
