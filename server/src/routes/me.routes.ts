import { Router } from 'express';
import * as me from '../controllers/me.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { myActivityQuery } from '../schemas/me.schema';

const router = Router();

// Any signed-in user (donor, admin, or super admin) - every handler reads only req.auth's own
// userId/sessionId, never a client-supplied one, so ownership is structurally enforced the same
// way as /donors/me/* (see CLAUDE.md's security section and donor.routes.ts for the pattern).
router.use(requireAuth);

router.get('/sessions', me.listSessions);
router.delete('/sessions/:id', validate({ params: idParam }), me.revokeSessionById);
router.post('/sessions/revoke-others', me.revokeOtherSessions);
router.get('/security/activity', validate({ query: myActivityQuery }), me.getActivity);

export default router;
