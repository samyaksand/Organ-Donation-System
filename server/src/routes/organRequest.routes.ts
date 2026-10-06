import { Router } from 'express';
import * as organRequests from '../controllers/organRequest.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { createOrganRequestSchema, listOrganRequestsQuery, reviewOrganRequestSchema } from '../schemas/organRequest.schema';

const router = Router();

// Admin/Super Admin only: there is no hospital login in this system, and requests reference
// internal organ/donor records, so this is never public or donor-accessible.
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/', validate({ query: listOrganRequestsQuery }), organRequests.list);
router.post('/', validate({ body: createOrganRequestSchema }), organRequests.create);
router.get('/:id', validate({ params: idParam }), organRequests.getById);
router.get('/:id/history', validate({ params: idParam }), organRequests.history);
router.patch('/:id', validate({ params: idParam, body: reviewOrganRequestSchema }), organRequests.review);
router.patch('/:id/cancel', validate({ params: idParam }), organRequests.cancel);

export default router;
