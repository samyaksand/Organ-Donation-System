import type { AdminOrgan, AvailabilitySummary, OrganStatus, OrganType, PublicOrgan } from '@/types/api';
import { api } from './client';

export interface OrganPayload {
  organType: OrganType;
  otherOrganName?: string | null;
  hospitalId: string;
  procurementDate: string;
  notes?: string | null;
}

export interface AdminCreateOrganPayload extends OrganPayload {
  donorCode: string;
  status: OrganStatus;
}

export type AdminUpdateOrganPayload = Partial<OrganPayload & { status: OrganStatus }>;

export type Availability = 'AVAILABLE' | 'UNAVAILABLE' | 'ALL';

export interface AvailabilityParams {
  organType?: OrganType;
  city?: string;
  hospitalId?: string;
  availability?: Availability;
  page?: number;
  pageSize?: number;
}

export interface AdminOrganParams {
  q?: string;
  organType?: OrganType;
  status?: OrganStatus;
  hospitalId?: string;
  page?: number;
  pageSize?: number;
}

export const organsApi = {
  // Public
  availability: (params: AvailabilityParams) => api.getPage<PublicOrgan>('/organs/availability', { ...params }),
  summary: () => api.get<AvailabilitySummary>('/organs/availability/summary'),

  // Admin
  list: (params: AdminOrganParams) => api.getPage<AdminOrgan>('/organs', { ...params }),
  create: (payload: AdminCreateOrganPayload) => api.post<AdminOrgan>('/organs', payload),
  update: (id: string, payload: AdminUpdateOrganPayload) => api.patch<AdminOrgan>(`/organs/${id}`, payload),
  remove: (id: string) => api.delete(`/organs/${id}`),
};
