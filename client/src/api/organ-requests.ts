import type { OrganRequest, OrganRequestStatus, WorkflowEvent } from '@/types/api';
import { api } from './client';

export interface OrganRequestListParams {
  q?: string;
  status?: OrganRequestStatus;
  hospitalId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateOrganRequestPayload {
  organId: string;
  hospitalId: string;
  notes?: string | null;
}

export interface ReviewOrganRequestPayload {
  status: 'APPROVED' | 'DECLINED';
  declineReason?: string | null;
}

export const organRequestsApi = {
  list: (params: OrganRequestListParams) => api.getPage<OrganRequest>('/organ-requests', { ...params }),
  get: (id: string) => api.get<OrganRequest>(`/organ-requests/${id}`),
  history: (id: string) => api.get<WorkflowEvent[]>(`/organ-requests/${id}/history`),
  create: (payload: CreateOrganRequestPayload) => api.post<OrganRequest>('/organ-requests', payload),
  review: (id: string, payload: ReviewOrganRequestPayload) => api.patch<OrganRequest>(`/organ-requests/${id}`, payload),
  cancel: (id: string) => api.patch<OrganRequest>(`/organ-requests/${id}/cancel`, {}),
};
