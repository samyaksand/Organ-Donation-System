import { Router } from 'express';
import * as donors from '../controllers/donor.controller';
import * as organs from '../controllers/organ.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
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

// Donor self-service (/me must be registered before /:id)
const donorOnly = requireRole('DONOR');
router.get('/me', donorOnly, donors.getMyProfile);
router.patch('/me', donorOnly, validate({ body: updateOwnProfileSchema }), donors.updateMyProfile);
router.put('/me/next-of-kin', donorOnly, validate({ body: nextOfKinSchema }), donors.updateMyNextOfKin);
router.get('/me/dashboard', donorOnly, donors.getMyDashboard);
router.get('/me/organs', donorOnly, organs.listMine);
router.post('/me/organs', donorOnly, validate({ body: donorCreateOrganSchema }), organs.createMine);

// Admin donor management
const adminOnly = requireRole('ADMIN', 'SUPER_ADMIN');
router.get('/', adminOnly, validate({ query: listDonorsQuery }), donors.list);
router.get('/:id', adminOnly, validate({ params: idParam }), donors.getById);
router.patch('/:id', adminOnly, validate({ params: idParam, body: adminUpdateDonorSchema }), donors.update);
router.put('/:id/password', adminOnly, validate({ params: idParam, body: adminResetPasswordSchema }), donors.resetPassword);
router.delete('/:id', adminOnly, validate({ params: idParam }), donors.remove);

export default router;
