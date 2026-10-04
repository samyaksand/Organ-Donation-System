import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { changePasswordSchema, loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.patch('/password', requireAuth, authRateLimiter, validate({ body: changePasswordSchema }), auth.changePassword);

export default router;
