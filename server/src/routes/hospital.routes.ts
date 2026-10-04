import { Router } from 'express';
import * as hospitals from '../controllers/hospital.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { hospitalSchema, listHospitalsQuery, updateHospitalSchema } from '../schemas/hospital.schema';

const router = Router();

// Public directory
router.get('/', validate({ query: listHospitalsQuery }), hospitals.list);
router.get('/options', hospitals.options);
router.get('/cities', hospitals.cities);
router.get('/:id', validate({ params: idParam }), hospitals.getById);

// Admin management
const admin = [requireAuth, requireRole('ADMIN', 'SUPER_ADMIN')];
router.post('/', ...admin, validate({ body: hospitalSchema }), hospitals.create);
router.patch('/:id', ...admin, validate({ params: idParam, body: updateHospitalSchema }), hospitals.update);
router.delete('/:id', ...admin, validate({ params: idParam }), hospitals.remove);

export default router;
