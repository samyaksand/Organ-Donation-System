import type { InvestigationResponse } from '@/types/api';
import { api } from './client';

/**
 * Operations Intelligence Agent. One endpoint, one call shape: a free-text `question`, or no
 * body at all for the general "analyze current operations" mode. The server does all tool
 * orchestration; this client never calls an individual tool directly. The response is either a
 * full InvestigationResult or an InvestigationBlocked (the AI Security Gateway rejected the
 * question before any provider call was made) - see InvestigationResponse.
 */
export const agentApi = {
  investigate: (question?: string) => api.post<InvestigationResponse>('/agent/investigate', question ? { question } : {}),
};
