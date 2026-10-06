import { Router } from 'express';
import * as agent from '../controllers/agent.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { agentRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { investigateRequestSchema } from '../schemas/agent.schema';

const router = Router();

// Admin/Super Admin only, same boundary as every other admin endpoint - the Operations
// Intelligence Agent reads operational data derived from donor/organ/hospital records and is
// never public or donor-accessible. Enforced here in Express middleware, not by LLM prompt
// wording (see agent/tools.ts header for the public/admin tool boundary this sets up for later).
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), agentRateLimiter);

router.post('/investigate', validate({ body: investigateRequestSchema }), agent.investigate);

export default router;
