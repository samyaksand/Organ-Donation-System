import type { AdminOverview } from '@/types/api';
import { api } from './client';

export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview'),
};
