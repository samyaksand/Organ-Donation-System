import type { Prisma } from '@prisma/client';
import { toDateOnly } from '../utils/dates';

/*
 * DTO mappers. Every API response passes through one of these so that sensitive columns
 * (password hashes, donor identity on public endpoints) can never leak by accident.
 */

export const hospitalSummarySelect = {
  id: true,
  name: true,
  city: true,
  state: true,
  address: true,
  phone: true,
  email: true,
} satisfies Prisma.HospitalSelect;

export type HospitalSummaryRow = Prisma.HospitalGetPayload<{ select: typeof hospitalSummarySelect }>;

export function toHospitalSummary(h: HospitalSummaryRow) {
  return { id: h.id, name: h.name, city: h.city, state: h.state, address: h.address, phone: h.phone, email: h.email };
}

// ---------------------------------------------------------------- Organs

export const publicOrganSelect = {
  id: true,
  organType: true,
  otherOrganName: true,
  status: true,
  procurementDate: true,
  hospital: { select: hospitalSummarySelect },
} satisfies Prisma.OrganSelect;

type PublicOrganRow = Prisma.OrganGetPayload<{ select: typeof publicOrganSelect }>;

/** Public organ availability record. Deliberately contains NO donor fields. */
export function toPublicOrgan(o: PublicOrganRow) {
  return {
    id: o.id,
    organType: o.organType,
    otherOrganName: o.otherOrganName,
    status: o.status,
    procurementDate: toDateOnly(o.procurementDate),
    hospital: toHospitalSummary(o.hospital),
  };
}

export const ownOrganSelect = {
  ...publicOrganSelect,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganSelect;

type OwnOrganRow = Prisma.OrganGetPayload<{ select: typeof ownOrganSelect }>;

export function toOwnOrgan(o: OwnOrganRow) {
  return {
    ...toPublicOrgan(o),
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export const adminOrganSelect = {
  ...ownOrganSelect,
  donor: { select: { id: true, donorCode: true, firstName: true, lastName: true, status: true } },
} satisfies Prisma.OrganSelect;

type AdminOrganRow = Prisma.OrganGetPayload<{ select: typeof adminOrganSelect }>;

/** Admin view: donor reduced to ID + name (no contact or medical data in organ lists). */
export function toAdminOrgan(o: AdminOrganRow) {
  return {
    ...toOwnOrgan(o),
    donor: {
      id: o.donor.id,
      donorCode: o.donor.donorCode,
      name: `${o.donor.firstName} ${o.donor.lastName}`,
      status: o.donor.status,
    },
  };
}

// ---------------------------------------------------------------- Donors

export const donorProfileSelect = {
  id: true,
  donorCode: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  personalDoctor: true,
  medicalConditions: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { email: true, lastLoginAt: true } },
  hospital: { select: hospitalSummarySelect },
  nextOfKin: { select: { name: true, phone: true, relationship: true, updatedAt: true } },
} satisfies Prisma.DonorSelect;

type DonorProfileRow = Prisma.DonorGetPayload<{ select: typeof donorProfileSelect }>;

export function toDonorProfile(d: DonorProfileRow) {
  return {
    id: d.id,
    donorCode: d.donorCode,
    email: d.user.email,
    firstName: d.firstName,
    lastName: d.lastName,
    gender: d.gender,
    dateOfBirth: toDateOnly(d.dateOfBirth),
    phone: d.phone,
    address: d.address,
    city: d.city,
    state: d.state,
    personalDoctor: d.personalDoctor,
    medicalConditions: d.medicalConditions,
    status: d.status,
    hospital: d.hospital ? toHospitalSummary(d.hospital) : null,
    nextOfKin: d.nextOfKin
      ? { name: d.nextOfKin.name, phone: d.nextOfKin.phone, relationship: d.nextOfKin.relationship }
      : null,
    lastLoginAt: d.user.lastLoginAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export const donorListSelect = {
  id: true,
  donorCode: true,
  firstName: true,
  lastName: true,
  city: true,
  state: true,
  status: true,
  createdAt: true,
  user: { select: { email: true } },
  _count: { select: { organs: true } },
  withdrawalRequests: { where: { status: 'PENDING' }, select: { id: true }, take: 1 },
} satisfies Prisma.DonorSelect;

type DonorListRow = Prisma.DonorGetPayload<{ select: typeof donorListSelect }>;

export function toDonorListItem(d: DonorListRow) {
  return {
    id: d.id,
    donorCode: d.donorCode,
    name: `${d.firstName} ${d.lastName}`,
    email: d.user.email,
    city: d.city,
    state: d.state,
    status: d.status,
    organCount: d._count.organs,
    hasPendingWithdrawal: d.withdrawalRequests.length > 0,
    createdAt: d.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------- Withdrawals

export const withdrawalSelect = {
  id: true,
  reason: true,
  status: true,
  adminNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: { select: { displayName: true } },
} satisfies Prisma.WithdrawalRequestSelect;

type WithdrawalRow = Prisma.WithdrawalRequestGetPayload<{ select: typeof withdrawalSelect }>;

export function toWithdrawal(w: WithdrawalRow) {
  return {
    id: w.id,
    reason: w.reason,
    status: w.status,
    adminNote: w.adminNote,
    reviewedBy: w.reviewedBy?.displayName ?? null,
    reviewedAt: w.reviewedAt?.toISOString() ?? null,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------- Organ requests

export const organRequestSelect = {
  id: true,
  status: true,
  notes: true,
  declineReason: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  organ: {
    select: {
      id: true,
      organType: true,
      otherOrganName: true,
      status: true,
      procurementDate: true,
      donor: { select: { id: true, donorCode: true } },
    },
  },
  hospital: { select: hospitalSummarySelect },
  requestedBy: { select: { displayName: true } },
  reviewedBy: { select: { displayName: true } },
} satisfies Prisma.OrganRequestSelect;

type OrganRequestRow = Prisma.OrganRequestGetPayload<{ select: typeof organRequestSelect }>;

/** Donor identity is deliberately reduced to id + donorCode - no name/contact/medical data. */
export function toOrganRequest(r: OrganRequestRow) {
  return {
    id: r.id,
    status: r.status,
    notes: r.notes,
    declineReason: r.declineReason,
    organ: {
      id: r.organ.id,
      organType: r.organ.organType,
      otherOrganName: r.organ.otherOrganName,
      status: r.organ.status,
      procurementDate: toDateOnly(r.organ.procurementDate),
      donorCode: r.organ.donor.donorCode,
    },
    hospital: toHospitalSummary(r.hospital),
    requestedBy: r.requestedBy?.displayName ?? null,
    reviewedBy: r.reviewedBy?.displayName ?? null,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const adminWithdrawalSelect = {
  ...withdrawalSelect,
  donor: {
    select: {
      id: true,
      donorCode: true,
      firstName: true,
      lastName: true,
      status: true,
      _count: { select: { organs: true } },
    },
  },
} satisfies Prisma.WithdrawalRequestSelect;

type AdminWithdrawalRow = Prisma.WithdrawalRequestGetPayload<{ select: typeof adminWithdrawalSelect }>;

export function toAdminWithdrawal(w: AdminWithdrawalRow) {
  return {
    ...toWithdrawal(w),
    donor: {
      id: w.donor.id,
      donorCode: w.donor.donorCode,
      name: `${w.donor.firstName} ${w.donor.lastName}`,
      status: w.donor.status,
      organCount: w.donor._count.organs,
    },
  };
}
