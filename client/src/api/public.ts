import type {
  InvestigationResult,
  PublicConcentration,
  PublicHospitalAvailability,
  PublicOrganAvailability,
  PublicOverview,
  PublicTrends,
  ThresholdBreach,
} from '@/types/api';
import { api } from './client';

/** Public (unauthenticated) analytics + investigation. Mirrors server's /public/* routes. */
export const publicApi = {
  overview: () => api.get<PublicOverview>('/public/analytics/overview'),
  organs: () => api.get<PublicOrganAvailability>('/public/analytics/organs'),
  hospitals: () => api.get<PublicHospitalAvailability>('/public/analytics/hospitals'),
  concentration: () => api.get<PublicConcentration>('/public/analytics/concentration'),
  trends: () => api.get<PublicTrends>('/public/analytics/trends'),
  breaches: () => api.get<ThresholdBreach[]>('/public/analytics/breaches'),
  investigate: (question?: string) => api.post<InvestigationResult>('/public/agent/investigate', question ? { question } : {}),
};
