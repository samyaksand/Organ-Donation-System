/*
 * API contract types. Mirrors the server DTO mappers (server/src/services/mappers.ts)
 * and Prisma enums (prisma/schema.prisma). Keep them in sync when the API changes.
 */

export const ORGAN_TYPES = ['KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA', 'OTHER'] as const;
export type OrganType = (typeof ORGAN_TYPES)[number];

export const ORGAN_STATUSES = ['PENDING', 'AVAILABLE', 'UNAVAILABLE'] as const;
export type OrganStatus = (typeof ORGAN_STATUSES)[number];

export const WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const ORGAN_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'] as const;
export type OrganRequestStatus = (typeof ORGAN_REQUEST_STATUSES)[number];

export const DONOR_STATUSES = ['PENDING', 'ACTIVE', 'WITHDRAWN'] as const;
export type DonorStatus = (typeof DONOR_STATUSES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_TYPES = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export type Role = 'DONOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

// ---------------------------------------------------------------- Auth

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  donor: { id: string; donorCode: string; firstName: string; lastName: string; status: DonorStatus } | null;
  admin: { id: string; displayName: string } | null;
}

// ---------------------------------------------------------------- Hospitals

export interface HospitalSummary {
  id: string;
  name: string;
  city: string;
  state: string | null;
  address: string;
  phone: string;
  email: string | null;
}

export interface HospitalWithAvailability extends HospitalSummary {
  availableOrganCount: number;
  availableByType: Array<{ organType: OrganType; count: number }>;
}

export interface HospitalOption {
  id: string;
  name: string;
  city: string;
}

// ---------------------------------------------------------------- Organs

/** Public record: never contains donor information. */
export interface PublicOrgan {
  id: string;
  organType: OrganType;
  otherOrganName: string | null;
  status: OrganStatus;
  procurementDate: string;
  hospital: HospitalSummary;
}

export interface OwnOrgan extends PublicOrgan {
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrgan extends OwnOrgan {
  donor: { id: string; donorCode: string; name: string; status: DonorStatus };
}

export interface AvailabilitySummary {
  byType: Array<{ organType: OrganType; available: number }>;
  totalAvailable: number;
  hospitalsWithAvailability: number;
  hospitalCount: number;
}

// ---------------------------------------------------------------- Donors

export interface NextOfKin {
  name: string;
  phone: string;
  relationship: string | null;
}

export interface DonorProfile {
  id: string;
  donorCode: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  personalDoctor: string | null;
  medicalConditions: string | null;
  status: DonorStatus;
  hospital: HospitalSummary | null;
  nextOfKin: NextOfKin | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  reason: string;
  status: WithdrawalStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'ACCOUNT_CREATED' | 'ORGAN_REGISTERED' | 'WITHDRAWAL_SUBMITTED' | 'WITHDRAWAL_REVIEWED';
  title: string;
  description: string | null;
  occurredAt: string;
}

export interface DonorDashboard {
  profile: DonorProfile;
  organs: { total: number; byStatus: Record<OrganStatus, number>; recent: OwnOrgan[] };
  latestWithdrawal: Withdrawal | null;
  activity: ActivityItem[];
}

export interface DonorListItem {
  id: string;
  donorCode: string;
  name: string;
  email: string;
  city: string;
  state: string;
  status: DonorStatus;
  organCount: number;
  hasPendingWithdrawal: boolean;
  createdAt: string;
}

export interface AdminDonorDetail extends DonorProfile {
  organs: OwnOrgan[];
  withdrawals: Withdrawal[];
}

export interface AdminWithdrawal extends Withdrawal {
  donor: { id: string; donorCode: string; name: string; status: DonorStatus; organCount: number };
}

export interface WorkflowEvent {
  id: string;
  eventType: 'CREATED' | 'STATUS_CHANGED';
  fromStatus: string | null;
  toStatus: string | null;
  actor: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------- Organ requests

/** Hospital's request for one specific organ. Donor identity is reduced to a donor code only. */
export interface OrganRequest {
  id: string;
  status: OrganRequestStatus;
  notes: string | null;
  declineReason: string | null;
  organ: {
    id: string;
    organType: OrganType;
    otherOrganName: string | null;
    status: OrganStatus;
    procurementDate: string;
    donorCode: string;
  };
  hospital: HospitalSummary;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  donors: Record<DonorStatus, number> & { total: number };
  organs: Record<OrganStatus, number> & { total: number };
  availableByType: Array<{ organType: OrganType; count: number }>;
  hospitalCount: number;
  pendingWithdrawals: number;
  pendingOrganRequests: number;
  recentDonors: DonorListItem[];
  recentWithdrawals: AdminWithdrawal[];
}

// ---------------------------------------------------------------- Analytics (Management MIS)

export const ANALYTICS_WINDOWS = ['today', '7d', '30d', '90d', 'thisMonth', 'lastMonth'] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

export interface AnalyticsWindowParams {
  window?: AnalyticsWindow;
  from?: string;
  to?: string;
}

export interface AnalyticsWindowMeta {
  label: string;
  start: string;
  end: string;
}

export interface PeriodComparison {
  current: number;
  previous: number;
  /** null when the previous period was 0 (percent change is mathematically undefined). */
  percentChange: number | null;
}

export interface AnalyticsOverview {
  donors: Record<DonorStatus, number> & { total: number };
  organs: Record<OrganStatus, number> & { total: number };
  withdrawals: Record<WithdrawalStatus, number> & { total: number };
  organRequests: Record<OrganRequestStatus, number> & { total: number };
  hospitals: { total: number; withAvailability: number; zeroAvailability: number };
}

export interface DonorAnalytics {
  window: AnalyticsWindowMeta;
  byStatus: Record<DonorStatus, number> & { total: number };
  byBloodType: Record<string, number>;
  registrations: PeriodComparison;
}

export interface OrganAnalytics {
  byStatus: Record<OrganStatus, number> & { total: number };
  byOrganType: Array<{ organType: OrganType; total: number; available: number }>;
  byHospital: Array<{ hospitalId: string; hospitalName: string; city: string | null; available: number; pending: number; unavailable: number; total: number }>;
}

export interface HospitalAnalytics {
  total: number;
  withAvailability: number;
  zeroAvailability: number;
  hospitals: Array<{ id: string; name: string; city: string; state: string | null; available: number; pending: number; unavailable: number; totalOrgans: number }>;
  zeroAvailabilityHospitals: Array<{ id: string; name: string; city: string }>;
}

export interface OldestPending {
  id: string;
  createdAt: string;
  ageDays: number;
}

export interface WithdrawalAnalytics {
  window: AnalyticsWindowMeta;
  byStatus: Record<WithdrawalStatus, number> & { total: number };
  requests: PeriodComparison;
  averageProcessingHours: number | null;
  reviewedCount: number;
  oldestPending: OldestPending | null;
  stalePendingThresholdDays: number;
  stalePendingCount: number;
}

export interface OrganRequestAnalytics {
  window: AnalyticsWindowMeta;
  byStatus: Record<OrganRequestStatus, number> & { total: number };
  requests: PeriodComparison;
  averageProcessingHours: number | null;
  reviewedCount: number;
  approvalRate: number | null;
  oldestPending: OldestPending | null;
  stalePendingThresholdDays: number;
  stalePendingCount: number;
  hospitalActivity: Array<{ hospitalId: string; hospitalName: string; city: string | null; total: number } & Record<OrganRequestStatus, number>>;
  requestVolumeTotal: number;
}

export interface AnalyticsTrends {
  window: AnalyticsWindowMeta & { granularity: 'day' | 'week' | 'month' };
  donorRegistrations: Record<string, number>;
  organRegistrations: Record<string, number>;
  withdrawalRequests: Record<string, number>;
  withdrawalApprovals: Record<string, number>;
  withdrawalDeclines: Record<string, number>;
  organRequests: Record<string, number>;
  organRequestApprovals: Record<string, number>;
  organRequestDeclines: Record<string, number>;
}

// ---------------------------------------------------------------- Public analytics (unauthenticated)

export interface PublicOverview {
  organs: Record<OrganStatus, number> & { total: number };
  hospitals: { total: number; withAvailability: number; zeroAvailability: number };
}

export interface PublicOrganAvailability {
  byStatus: Record<OrganStatus, number> & { total: number };
  byOrganType: Array<{ organType: OrganType; total: number; available: number }>;
  byHospital: Array<{ hospitalId: string; hospitalName: string; city: string | null; available: number; total: number }>;
}

export interface PublicHospitalAvailability {
  total: number;
  withAvailability: number;
  zeroAvailability: number;
  hospitals: Array<{ id: string; name: string; city: string; state: string | null; available: number; totalOrgans: number }>;
  zeroAvailabilityHospitals: Array<{ id: string; name: string; city: string }>;
}

export interface PublicConcentration {
  totalAvailable: number;
  topHospital: { hospitalId: string; hospitalName: string; city: string | null; available: number; sharePercent: number } | null;
  byHospital: Array<{ hospitalId: string; hospitalName: string; city: string | null; available: number; sharePercent: number }>;
}

export interface PublicTrends {
  window: AnalyticsWindowMeta;
  organRegistrations: Record<string, number>;
}

export type ThresholdBreach = {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  evidence: string;
  metric: string;
  affected: string;
};

// ---------------------------------------------------------------- Pledges (public, no account)

/** A public "intent to donate" pledge - deliberately NOT a Donor record. */
export interface Pledge {
  referenceId: string;
  fullName: string;
  city: string;
  organPreference: OrganType;
  createdAt: string;
}

// ---------------------------------------------------------------- Operations Intelligence Agent

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info';

/**
 * One investigation finding. `facts` are deterministic values the agent pulled from its tools;
 * `interpretation` is the agent's own reasoning connecting them; `recommendation` is a
 * suggested human action (the agent never acts itself). Mirrors
 * server/src/schemas/agent.schema.ts's findingSchema.
 */
export interface AgentFinding {
  severity: FindingSeverity;
  title: string;
  facts: string[];
  interpretation: string;
  recommendation: string;
  evidence: string[];
}

export interface InvestigationResult {
  summary: string;
  findings: AgentFinding[];
  toolsUsed: string[];
  insufficientEvidence: boolean;
  generatedAt: string;
}

// ---------------------------------------------------------------- System recovery (Super Admin)

export type RecoveryStatus = 'SUCCEEDED' | 'FAILED';

export type RecoveryState =
  | { enabled: false; snapshot: { available: false; createdAt: null }; currentState: null; lastRecovery: null }
  | {
      enabled: true;
      snapshot: { available: true; createdAt: string } | { available: false; createdAt: null };
      currentState: { donorCount: number; organCount: number; hospitalCount: number };
      lastRecovery: {
        status: RecoveryStatus;
        startedAt: string;
        finishedAt: string | null;
        initiatorEmail: string;
        message: string | null;
      } | null;
    };

export interface RecoveryActionResult {
  ok: boolean;
  message: string;
}
