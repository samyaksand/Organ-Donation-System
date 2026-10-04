import type { Gender, SessionUser } from '@/types/api';
import { api } from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  personalDoctor?: string | null;
  hospitalId?: string | null;
  medicalConditions?: string | null;
  nextOfKin: { name: string; phone: string; relationship?: string | null };
}

export interface LoginPayload {
  email: string;
  password: string;
  portal: 'DONOR' | 'ADMIN';
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authApi = {
  me: () => api.get<{ user: SessionUser }>('/auth/me').then((r) => r.user),
  login: (payload: LoginPayload) => api.post<{ user: SessionUser }>('/auth/login', payload).then((r) => r.user),
  register: (payload: RegisterPayload) => api.post<{ user: SessionUser }>('/auth/register', payload).then((r) => r.user),
  logout: () => api.post<void>('/auth/logout'),
  changePassword: (payload: ChangePasswordPayload) => api.patch<{ message: string }>('/auth/password', payload),
};
