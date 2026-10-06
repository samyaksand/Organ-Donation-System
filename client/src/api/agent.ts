import type { InvestigationResult } from '@/types/api';
import { api } from './client';

/**
 * Operations Intelligence Agent. One endpoint, one call shape: a free-text `question`, or no
 * body at all for the general "analyze current operations" mode. The server does all tool
 * orchestration; this client never calls an individual tool directly.
 */
export const agentApi = {
  investigate: (question?: string) => api.post<InvestigationResult>('/agent/investigate', question ? { question } : {}),
};
