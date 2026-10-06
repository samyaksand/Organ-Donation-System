import { Router } from 'express';
import * as publicAgent from '../controllers/publicAgent.controller';
import { publicAgentRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { investigateRequestSchema } from '../schemas/agent.schema';

const router = Router();

// Unauthenticated by design. Uses ONLY agent/publicTools.ts's restricted toolset - never
// ADMIN_TOOLS - so there is no code path by which this endpoint can reach donor identity,
// individual withdrawal/organ-request records, or workflow history. See agent/publicTools.ts.
router.use(publicAgentRateLimiter);

router.post('/investigate', validate({ body: investigateRequestSchema }), publicAgent.investigate);

export default router;
