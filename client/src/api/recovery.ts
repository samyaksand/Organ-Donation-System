import type { RecoveryActionResult, RecoveryState } from '@/types/api';
import { api } from './client';

export const recoveryApi = {
  status: () => api.get<RecoveryState>('/recovery/status'),
  restore: () => api.post<RecoveryActionResult>('/recovery/restore'),
};
