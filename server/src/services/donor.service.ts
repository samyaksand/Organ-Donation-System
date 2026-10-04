import type { OrganStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type {
  AdminUpdateDonorInput,
  ListDonorsQuery,
  NextOfKinInput,
  UpdateOwnProfileInput,
} from '../schemas/donor.schema';
import { parseDateOnly } from '../utils/dates';
import { AppError, fieldErrors } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { buildPageMeta, pageArgs } from '../utils/response';
import {
  donorListSelect,
  donorProfileSelect,
  ownOrganSelect,
  toDonorListItem,
  toDonorProfile,
  toOwnOrgan,
  toWithdrawal,
  withdrawalSelect,
} from './mappers';

async function assertHospitalExists(hospitalId: string | null | undefined) {
  if (!hospitalId) return;
  const found = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { id: true } });
  if (!found) throw AppError.badRequest('Selected hospital does not exist', fieldErrors(['hospitalId', 'Select a valid hospital']));
}

export async function getProfile(donorId: string) {
  const donor = await prisma.donor.findUnique({ where: { id: donorId }, select: donorProfileSelect });
  if (!donor) throw AppError.notFound('Donor');
  return toDonorProfile(donor);
}

/** Donor self-service update (replaces legacy POST /auth/dupdate). */
export async function updateOwnProfile(donorId: string, input: UpdateOwnProfileInput) {
  await assertHospitalExists(input.hospitalId);

  const data: Prisma.DonorUpdateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : undefined,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    personalDoctor: input.personalDoctor,
    medicalConditions: input.medicalConditions,
  };
  if (input.hospitalId !== undefined) {
    data.hospital = input.hospitalId ? { connect: { id: input.hospitalId } } : { disconnect: true };
  }

  const donor = await prisma.donor.update({ where: { id: donorId }, data, select: donorProfileSelect });
  return toDonorProfile(donor);
}

/** Legacy dupdate fields Name / KContact (nextofkin table). */
export async function upsertNextOfKin(donorId: string, input: NextOfKinInput) {
  const nok = await prisma.nextOfKin.upsert({
    where: { donorId },
    create: { donorId, name: input.name, phone: input.phone, relationship: input.relationship ?? null },
    update: { name: input.name, phone: input.phone, relationship: input.relationship ?? null },
    select: { name: true, phone: true, relationship: true },
  });
  return nok;
}

type ActivityItem = {
  id: string;
  type: 'ACCOUNT_CREATED' | 'ORGAN_REGISTERED' | 'WITHDRAWAL_SUBMITTED' | 'WITHDRAWAL_REVIEWED';
  title: string;
  description: string | null;
  occurredAt: string;
};

/**
 * Donor dashboard: everything is derived from stored records (no invented figures).
 * Activity is reconstructed from timestamps on the donor's own rows.
 */
export async function getDashboard(donorId: string) {
  const [donor, organs, withdrawals] = await Promise.all([
    prisma.donor.findUnique({ where: { id: donorId }, select: donorProfileSelect }),
    prisma.organ.findMany({ where: { donorId }, select: ownOrganSelect, orderBy: { createdAt: 'desc' } }),
    prisma.withdrawalRequest.findMany({ where: { donorId }, select: withdrawalSelect, orderBy: { createdAt: 'desc' } }),
  ]);
  if (!donor) throw AppError.notFound('Donor');

  const organCounts: Record<OrganStatus, number> = { PENDING: 0, AVAILABLE: 0, UNAVAILABLE: 0 };
  for (const o of organs) organCounts[o.status] += 1;

  const accountCreated: ActivityItem = {
    id: `account-${donor.id}`,
    type: 'ACCOUNT_CREATED',
    title: 'Donor account created',
    description: `Donor ID ${donor.donorCode}`,
    occurredAt: donor.createdAt.toISOString(),
  };

  const activity: ActivityItem[] = [
    accountCreated,
    ...organs.map<ActivityItem>((o) => ({
      id: `organ-${o.id}`,
      type: 'ORGAN_REGISTERED',
      title: 'Organ registered',
      description: `${o.organType === 'OTHER' && o.otherOrganName ? o.otherOrganName : o.organType} at ${o.hospital.name}`,
      occurredAt: o.createdAt.toISOString(),
    })),
    ...withdrawals.flatMap<ActivityItem>((w) => {
      const items: ActivityItem[] = [
        {
          id: `withdrawal-${w.id}`,
          type: 'WITHDRAWAL_SUBMITTED',
          title: 'Withdrawal request submitted',
          description: null,
          occurredAt: w.createdAt.toISOString(),
        },
      ];
      if (w.reviewedAt) {
        items.push({
          id: `withdrawal-review-${w.id}`,
          type: 'WITHDRAWAL_REVIEWED',
          title: w.status === 'APPROVED' ? 'Withdrawal request approved' : 'Withdrawal request declined',
          description: w.adminNote,
          occurredAt: w.reviewedAt.toISOString(),
        });
      }
      return items;
    }),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 8);

  return {
    profile: toDonorProfile(donor),
    organs: { total: organs.length, byStatus: organCounts, recent: organs.slice(0, 5).map(toOwnOrgan) },
    latestWithdrawal: withdrawals[0] ? toWithdrawal(withdrawals[0]) : null,
    activity,
  };
}

// ---------------------------------------------------------------- Admin

export async function listDonors(query: ListDonorsQuery) {
  const where: Prisma.DonorWhereInput = {
    status: query.status,
    ...(query.q
      ? {
          OR: [
            { firstName: { contains: query.q, mode: 'insensitive' } },
            { lastName: { contains: query.q, mode: 'insensitive' } },
            { donorCode: { contains: query.q, mode: 'insensitive' } },
            { city: { contains: query.q, mode: 'insensitive' } },
            { user: { email: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.donor.findMany({
      where,
      select: donorListSelect,
      orderBy: { createdAt: 'desc' },
      ...pageArgs(query.page, query.pageSize),
    }),
    prisma.donor.count({ where }),
  ]);

  return { items: rows.map(toDonorListItem), meta: buildPageMeta(query.page, query.pageSize, total) };
}

export async function getDonorForAdmin(donorId: string) {
  const [profile, organs, withdrawals] = await Promise.all([
    getProfile(donorId),
    prisma.organ.findMany({ where: { donorId }, select: ownOrganSelect, orderBy: { createdAt: 'desc' } }),
    prisma.withdrawalRequest.findMany({ where: { donorId }, select: withdrawalSelect, orderBy: { createdAt: 'desc' } }),
  ]);
  return { ...profile, organs: organs.map(toOwnOrgan), withdrawals: withdrawals.map(toWithdrawal) };
}

/** Admin update (legacy POST /auth/update: Email / Ailments / Contact, now whitelisted). */
export async function adminUpdateDonor(donorId: string, input: AdminUpdateDonorInput) {
  const exists = await prisma.donor.findUnique({ where: { id: donorId }, select: { id: true } });
  if (!exists) throw AppError.notFound('Donor');

  const donor = await prisma.donor.update({
    where: { id: donorId },
    data: {
      phone: input.phone,
      medicalConditions: input.medicalConditions,
      status: input.status,
      ...(input.email ? { user: { update: { email: input.email } } } : {}),
    },
    select: donorProfileSelect,
  });
  return toDonorProfile(donor);
}

/** Legacy admin "update Password" option, now a dedicated, hashed reset. */
export async function adminResetDonorPassword(donorId: string, newPassword: string) {
  const donor = await prisma.donor.findUnique({ where: { id: donorId }, select: { userId: true } });
  if (!donor) throw AppError.notFound('Donor');
  await prisma.user.update({ where: { id: donor.userId }, data: { passwordHash: await hashPassword(newPassword) } });
}

/**
 * Legacy POST /auth/delete removed the donor and their deletionreason rows.
 * Deleting the User cascades to Donor, NextOfKin, Organs and WithdrawalRequests (FK ON DELETE CASCADE).
 */
export async function deleteDonor(donorId: string) {
  const donor = await prisma.donor.findUnique({ where: { id: donorId }, select: { userId: true } });
  if (!donor) throw AppError.notFound('Donor');
  await prisma.user.delete({ where: { id: donor.userId } });
}
