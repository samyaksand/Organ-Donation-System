import { Router } from 'express';
import * as publicSecurity from '../controllers/publicSecurity.controller';
import { publicRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { explorePolicySchema } from '../schemas/security.schema';

const router = Router();

// Unauthenticated by design - the public Privacy & Security page's interactive Policy Explorer
// and Data Classification Explorer. Evaluates against the SAME policy engine the server itself
// enforces (security/policyEngine.ts); never a hard-coded frontend table.
router.use(publicRateLimiter);

router.post('/explore', validate({ body: explorePolicySchema }), publicSecurity.explore);
router.get('/matrix', publicSecurity.matrix);

export default router;
