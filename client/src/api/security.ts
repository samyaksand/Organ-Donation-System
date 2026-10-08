import type {
  AiSecurityBreakdown,
  AiSecurityEventList,
  AnalyticsWindowParams,
  PolicyViolationSummary,
  SecurityDecisionBreakdown,
  SecurityEventList,
  SecurityEventListParams,
  SecurityOverview,
  SecurityTrends,
} from '@/types/api';
import { api } from './client';

/** Admin Security dashboard. Mirrors server/src/services/security.service.ts - every figure is
 * a real count over SecurityEvent/AiSecurityEvent, never fabricated. */
export const securityApi = {
  overview: (params: AnalyticsWindowParams) => api.get<SecurityOverview>('/security/overview', { ...params }),
  decisions: (params: AnalyticsWindowParams) => api.get<SecurityDecisionBreakdown>('/security/decisions', { ...params }),
  denied: (params: SecurityEventListParams) => api.get<SecurityEventList>('/security/denied', { ...params }),
  violations: (params: AnalyticsWindowParams) => api.get<PolicyViolationSummary>('/security/violations', { ...params }),
  trends: (params: AnalyticsWindowParams) => api.get<SecurityTrends>('/security/trends', { ...params }),
  history: (params: SecurityEventListParams) => api.get<SecurityEventList>('/security/history', { ...params }),
  aiEvents: (params: SecurityEventListParams) => api.get<AiSecurityEventList>('/security/ai-events', { ...params }),
  aiBreakdown: (params: AnalyticsWindowParams) => api.get<AiSecurityBreakdown>('/security/ai-breakdown', { ...params }),
};
