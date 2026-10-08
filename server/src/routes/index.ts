import { Router } from 'express';
import adminRoutes from './admin.routes';
import agentRoutes from './agent.routes';
import analyticsRoutes from './analytics.routes';
import authRoutes from './auth.routes';
import donorRoutes from './donor.routes';
import hospitalRoutes from './hospital.routes';
import meRoutes from './me.routes';
import organRoutes from './organ.routes';
import organRequestRoutes from './organRequest.routes';
import pledgeRoutes from './pledge.routes';
import publicAgentRoutes from './publicAgent.routes';
import publicAnalyticsRoutes from './publicAnalytics.routes';
import publicSecurityRoutes from './publicSecurity.routes';
import recoveryRoutes from './recovery.routes';
import securityRoutes from './security.routes';
import withdrawalRoutes from './withdrawal.routes';

/** Versioned API: mounted at /api/v1. */
export const apiV1 = Router();

apiV1.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

apiV1.use('/auth', authRoutes);
apiV1.use('/donors', donorRoutes);
apiV1.use('/me', meRoutes);
apiV1.use('/organs', organRoutes);
apiV1.use('/hospitals', hospitalRoutes);
apiV1.use('/withdrawals', withdrawalRoutes);
apiV1.use('/organ-requests', organRequestRoutes);
apiV1.use('/admin', adminRoutes);
apiV1.use('/analytics', analyticsRoutes);
apiV1.use('/agent', agentRoutes);
apiV1.use('/public/analytics', publicAnalyticsRoutes);
apiV1.use('/public/agent', publicAgentRoutes);
apiV1.use('/public/security', publicSecurityRoutes);
apiV1.use('/pledges', pledgeRoutes);
apiV1.use('/recovery', recoveryRoutes);
apiV1.use('/security', securityRoutes);
