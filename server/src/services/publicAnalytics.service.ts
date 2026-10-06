/**
 * Public (unauthenticated) analytics DTOs. Every function here calls the SAME deterministic
 * analytics.service.ts functions the admin Analytics dashboard and the admin agent tools use -
 * no parallel calculation - and then narrows the result to aggregate-only fields before
 * returning it. This narrowing is the actual enforcement of the public/private data boundary:
 * it happens here in a plain TypeScript object literal, not by trusting the frontend to not
 * render certain fields. Never add a field here that identifies a donor, names an individual
 * withdrawal/organ-request record, or exposes administrative/workflow detail.
 */
import * as analytics from './analytics.service';
import type { AnalyticsWindowQuery, TrendsQuery } from '../schemas/analytics.schema';

export async function getOverview() {
  const data = await analytics.getOverview();
  return {
    organs: data.organs,
    hospitals: data.hospitals,
  };
}

export async function getOrganAvailability() {
  const data = await analytics.getOrganAnalytics();
  return {
    byStatus: data.byStatus,
    byOrganType: data.byOrganType,
    byHospital: data.byHospital.map((h) => ({ hospitalId: h.hospitalId, hospitalName: h.hospitalName, city: h.city, available: h.available, total: h.total })),
  };
}

export async function getHospitalAvailability() {
  const data = await analytics.getHospitalAnalytics();
  return {
    total: data.total,
    withAvailability: data.withAvailability,
    zeroAvailability: data.zeroAvailability,
    hospitals: data.hospitals.map((h) => ({ id: h.id, name: h.name, city: h.city, state: h.state, available: h.available, totalOrgans: h.totalOrgans })),
    zeroAvailabilityHospitals: data.zeroAvailabilityHospitals,
  };
}

export async function getConcentration() {
  return analytics.getOrganAvailabilityConcentration();
}

/** Organ-registration trend only - donor/withdrawal/organ-request trends stay admin-only. */
export async function getTrends(query: TrendsQuery) {
  const trends = await analytics.getTrends(query);
  return { window: trends.window, organRegistrations: trends.organRegistrations };
}

export async function getThresholdBreaches(query: AnalyticsWindowQuery) {
  const breaches = await analytics.getThresholdBreaches(query);
  // Already aggregate-only (hospital names/counts, no individual records) - reused verbatim.
  return breaches;
}
