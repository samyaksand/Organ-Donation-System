import { Router } from 'express';
import * as organs from '../controllers/organ.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import {
  adminCreateOrganSchema,
  adminListOrgansQuery,
  adminUpdateOrganSchema,
  publicOrganSearchQuery,
} from '../schemas/organ.schema';

const router = Router();

// Public (no donor identity in responses)
router.get('/availability', validate({ query: publicOrganSearchQuery }), organs.searchAvailability);
router.get('/availability/summary', organs.availabilitySummary);

// Admin organ management
const admin = [requireAuth, requireRole('ADMIN')];
router.get('/', ...admin, validate({ query: adminListOrgansQuery }), organs.list);
router.post('/', ...admin, validate({ body: adminCreateOrganSchema }), organs.create);
router.patch('/:id', ...admin, validate({ params: idParam, body: adminUpdateOrganSchema }), organs.update);
router.delete('/:id', ...admin, validate({ params: idParam }), organs.remove);

export default router;
