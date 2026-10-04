import type { AdminWithdrawal, Withdrawal, WithdrawalStatus } from '@/types/api';
import { api } from './client';

export interface WithdrawalListParams {
  q?: string;
  status?: WithdrawalStatus;
  page?: number;
  pageSize?: number;
}

export interface ReviewWithdrawalPayload {
  status: 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
}

export const withdrawalsApi = {
  mine: () => api.get<Withdrawal[]>('/withdrawals/mine'),
  create: (reason: string) => api.post<Withdrawal>('/withdrawals', { reason }),
  list: (params: WithdrawalListParams) => api.getPage<AdminWithdrawal>('/withdrawals', { ...params }),
  review: (id: string, payload: ReviewWithdrawalPayload) => api.patch<AdminWithdrawal>(`/withdrawals/${id}`, payload),
};
