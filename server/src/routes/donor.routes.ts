import { Router, type Request } from 'express';
import * as donors from '../controllers/donor.controller';
import * as organs from '../controllers/organ.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { auditedAccess } from '../security/middleware';
import {
  adminResetPasswordSchema,
  adminUpdateDonorSchema,
  listDonorsQuery,
  nextOfKinSchema,
  updateOwnProfileSchema,
} from '../schemas/donor.schema';
import { donorCreateOrganSchema } from '../schemas/organ.schema';

const router = Router();
router.use(requireAuth);

// Donor self-service (/me must be registered before /:id). Ownership is already structurally
// enforced here (every handler reads donorIdOf(req) from the JWT, never a client-supplied id);
// auditedAccess adds the policy-engine explanation and SecurityEvent audit row on top, with
// resourceOwnerId set to the actor's own donorId so the ownership check always passes and the
// audit trail reflects what actually happened.
const donorOnly = requireRole('DONOR');
const ownDonorId = (req: Request) => req.auth?.donorId ?? undefined;
router.get('/me', donorOnly, auditedAccess('donor-profile', 'VIEW', ownDonorId), donors.getMyProfile);
router.patch('/me', donorOnly, auditedAccess('donor-profile', 'UPDATE', ownDonorId), validate({ body: updateOwnProfileSchema }), donors.updateMyProfile);
router.put('/me/next-of-kin', donorOnly, auditedAccess('donor-next-of-kin', 'UPDATE', ownDonorId), validate({ body: nextOfKinSchema }), donors.updateMyNextOfKin);
router.get('/me/dashboard', donorOnly, auditedAccess('donor-profile', 'VIEW', ownDonorId), donors.getMyDashboard);
router.get('/me/organs', donorOnly, auditedAccess('donor-organ', 'VIEW', ownDonorId), organs.listMine);
router.post('/me/organs', donorOnly, auditedAccess('donor-organ', 'CREATE', ownDonorId), validate({ body: donorCreateOrganSchema }), organs.createMine);

// Admin donor management
const adminOnly = requireRole('ADMIN', 'SUPER_ADMIN');
router.get('/', adminOnly, auditedAccess('admin-donor-records', 'VIEW'), validate({ query: listDonorsQuery }), donors.list);
router.get('/:id', adminOnly, auditedAccess('admin-donor-records', 'VIEW'), validate({ params: idParam }), donors.getById);
router.patch('/:id', adminOnly, validate({ params: idParam, body: adminUpdateDonorSchema }), donors.update);
router.put('/:id/password', adminOnly, validate({ params: idParam, body: adminResetPasswordSchema }), donors.resetPassword);
router.delete('/:id', adminOnly, validate({ params: idParam }), donors.remove);

export default router;
