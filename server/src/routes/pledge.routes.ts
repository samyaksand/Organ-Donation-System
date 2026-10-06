import { Router } from 'express';
import * as pledge from '../controllers/pledge.controller';
import { publicRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { createPledgeSchema, pledgeReferenceParam } from '../schemas/pledge.schema';

const router = Router();

// Public, no account required - see prisma/schema.prisma's Pledge doc comment for why this is
// never a Donor record. Shares the same public rate limiter as /public/analytics.
router.use(publicRateLimiter);

router.post('/', validate({ body: createPledgeSchema }), pledge.create);
router.get('/:referenceId/certificate', validate({ params: pledgeReferenceParam }), pledge.getCertificate);

export default router;
