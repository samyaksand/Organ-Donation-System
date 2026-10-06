import type { OrganType, Pledge } from '@/types/api';
import { api } from './client';

export interface CreatePledgePayload {
  fullName: string;
  email: string;
  city: string;
  organPreference: OrganType;
  consent: true;
}

export const pledgesApi = {
  create: (payload: CreatePledgePayload) => api.post<Pledge>('/pledges', payload),
  /** Returns a browser-navigable URL; the certificate is a PDF streamed directly by the server. */
  certificateUrl: (referenceId: string) => {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
    return `${base}/api/v1/pledges/${encodeURIComponent(referenceId)}/certificate`;
  },
};
