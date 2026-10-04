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

export const DONOR_STATUSES = ['ACTIVE', 'WITHDRAWN'] as const;
export type DonorStatus = (typeof DONOR_STATUSES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Gender = (typeof GENDERS)[number];

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

export interface AdminOverview {
  donors: Record<DonorStatus, number> & { total: number };
  organs: Record<OrganStatus, number> & { total: number };
  availableByType: Array<{ organType: OrganType; count: number }>;
  hospitalCount: number;
  pendingWithdrawals: number;
  recentDonors: DonorListItem[];
  recentWithdrawals: AdminWithdrawal[];
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
