import { Router } from 'express';
import * as organRequests from '../controllers/organRequest.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { auditedAccess } from '../security/middleware';
import { createOrganRequestSchema, listOrganRequestsQuery, reviewOrganRequestSchema } from '../schemas/organRequest.schema';

const router = Router();

// Admin/Super Admin only: there is no hospital login in this system, and requests reference
// internal organ/donor records, so this is never public or donor-accessible.
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/', auditedAccess('admin-organ-requests', 'VIEW'), validate({ query: listOrganRequestsQuery }), organRequests.list);
router.post('/', auditedAccess('admin-organ-requests', 'CREATE'), validate({ body: createOrganRequestSchema }), organRequests.create);
router.get('/:id', auditedAccess('admin-organ-requests', 'VIEW'), validate({ params: idParam }), organRequests.getById);
router.get('/:id/history', auditedAccess('admin-organ-requests', 'VIEW'), validate({ params: idParam }), organRequests.history);
router.patch('/:id', auditedAccess('admin-organ-requests', 'REVIEW'), validate({ params: idParam, body: reviewOrganRequestSchema }), organRequests.review);
router.patch('/:id/cancel', auditedAccess('admin-organ-requests', 'REVIEW'), validate({ params: idParam }), organRequests.cancel);

export default router;
