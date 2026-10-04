import type {
  AdminDonorDetail,
  DonorDashboard,
  DonorListItem,
  DonorProfile,
  DonorStatus,
  Gender,
  NextOfKin,
  OwnOrgan,
} from '@/types/api';
import { api } from './client';
import type { OrganPayload } from './organs';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  personalDoctor?: string | null;
  hospitalId?: string | null;
  medicalConditions?: string | null;
}

export interface NextOfKinPayload {
  name: string;
  phone: string;
  relationship?: string | null;
}

export interface DonorListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: DonorStatus;
}

export interface AdminUpdateDonorPayload {
  email?: string;
  phone?: string;
  medicalConditions?: string | null;
  status?: DonorStatus;
}

export const donorsApi = {
  // Donor self-service
  myProfile: () => api.get<DonorProfile>('/donors/me'),
  myDashboard: () => api.get<DonorDashboard>('/donors/me/dashboard'),
  updateMyProfile: (payload: UpdateProfilePayload) => api.patch<DonorProfile>('/donors/me', payload),
  updateMyNextOfKin: (payload: NextOfKinPayload) => api.put<NextOfKin>('/donors/me/next-of-kin', payload),
  myOrgans: () => api.get<OwnOrgan[]>('/donors/me/organs'),
  createMyOrgan: (payload: OrganPayload) => api.post<OwnOrgan>('/donors/me/organs', payload),

  // Admin
  list: (params: DonorListParams) => api.getPage<DonorListItem>('/donors', { ...params }),
  get: (id: string) => api.get<AdminDonorDetail>(`/donors/${id}`),
  update: (id: string, payload: AdminUpdateDonorPayload) => api.patch<DonorProfile>(`/donors/${id}`, payload),
  resetPassword: (id: string, newPassword: string) => api.put<{ message: string }>(`/donors/${id}/password`, { newPassword }),
  remove: (id: string) => api.delete(`/donors/${id}`),
};
