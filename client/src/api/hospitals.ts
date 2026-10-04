import type { HospitalOption, HospitalSummary, HospitalWithAvailability } from '@/types/api';
import { api } from './client';

export interface HospitalPayload {
  name: string;
  city: string;
  state?: string | null;
  address: string;
  phone: string;
  email?: string | null;
}

export interface HospitalListParams {
  q?: string;
  city?: string;
  page?: number;
  pageSize?: number;
}

export const hospitalsApi = {
  list: (params: HospitalListParams) => api.getPage<HospitalWithAvailability>('/hospitals', { ...params }),
  get: (id: string) => api.get<HospitalWithAvailability>(`/hospitals/${id}`),
  options: () => api.get<HospitalOption[]>('/hospitals/options'),
  cities: () => api.get<string[]>('/hospitals/cities'),
  create: (payload: HospitalPayload) => api.post<HospitalSummary>('/hospitals', payload),
  update: (id: string, payload: Partial<HospitalPayload>) => api.patch<HospitalSummary>(`/hospitals/${id}`, payload),
  remove: (id: string) => api.delete(`/hospitals/${id}`),
};
