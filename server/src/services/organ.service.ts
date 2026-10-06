import type { OrganStatus, OrganType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ORGAN_TYPES } from '../schemas/common';
import type {
  AdminCreateOrganInput,
  AdminListOrgansQuery,
  AdminUpdateOrganInput,
  DonorCreateOrganInput,
  PublicOrganSearchQuery,
} from '../schemas/organ.schema';
import { parseDateOnly } from '../utils/dates';
import { AppError, fieldErrors } from '../utils/errors';
import { buildPageMeta, pageArgs } from '../utils/response';
import {
  adminOrganSelect,
  ownOrganSelect,
  publicOrganSelect,
  toAdminOrgan,
  toOwnOrgan,
  toPublicOrgan,
} from './mappers';
import { recordCreated, recordStatusChanged } from './workflowEvent.service';

/** Statuses the public may ever see. PENDING (unverified) organs are never public. */
const PUBLIC_STATUSES: OrganStatus[] = ['AVAILABLE', 'UNAVAILABLE'];

async function assertHospital(hospitalId: string) {
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { id: true } });
  if (!hospital) throw AppError.badRequest('Selected hospital does not exist', fieldErrors(['hospitalId', 'Select a valid hospital']));
}

// ---------------------------------------------------------------- Public

/** Replaces legacy POST /auth/organavail (organs NATURAL JOIN hospitaldetails by name + city). */
export async function searchPublic(query: PublicOrganSearchQuery) {
  const where: Prisma.OrganWhereInput = {
    status: query.availability === 'ALL' ? { in: PUBLIC_STATUSES } : query.availability,
    organType: query.organType,
    hospitalId: query.hospitalId,
    ...(query.city ? { hospital: { city: { contains: query.city, mode: 'insensitive' } } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.organ.findMany({
      where,
      select: publicOrganSelect,
      orderBy: [{ status: 'asc' }, { procurementDate: 'desc' }],
      ...pageArgs(query.page, query.pageSize),
    }),
    prisma.organ.count({ where }),
  ]);

  return { items: rows.map(toPublicOrgan), meta: buildPageMeta(query.page, query.pageSize, total) };
}

/** Real aggregate counts for the landing page. Returns zeros when the database is empty. */
export async function availabilitySummary() {
  const [grouped, hospitalsWithAvailability, hospitalCount] = await Promise.all([
    prisma.organ.groupBy({ by: ['organType'], where: { status: 'AVAILABLE' }, _count: { _all: true } }),
    prisma.hospital.count({ where: { organs: { some: { status: 'AVAILABLE' } } } }),
    prisma.hospital.count(),
  ]);

  const counts = new Map<OrganType, number>(grouped.map((g) => [g.organType, g._count._all]));
  const byType = ORGAN_TYPES.map((organType) => ({ organType, available: counts.get(organType) ?? 0 }));

  return {
    byType,
    totalAvailable: byType.reduce((sum, t) => sum + t.available, 0),
    hospitalsWithAvailability,
    hospitalCount,
  };
}

// ---------------------------------------------------------------- Donor

export async function listOwn(donorId: string) {
  const organs = await prisma.organ.findMany({ where: { donorId }, select: ownOrganSelect, orderBy: { createdAt: 'desc' } });
  return organs.map(toOwnOrgan);
}

export async function createOwn(donorId: string, input: DonorCreateOrganInput) {
  const donor = await prisma.donor.findUnique({ where: { id: donorId }, select: { status: true } });
  if (!donor) throw AppError.notFound('Donor');
  if (donor.status === 'WITHDRAWN') {
    throw AppError.forbidden('Your donor registration has been withdrawn. Contact an administrator to reactivate it.');
  }
  await assertHospital(input.hospitalId);

  const organ = await prisma.organ.create({
    data: {
      donorId,
      hospitalId: input.hospitalId,
      organType: input.organType,
      otherOrganName: input.organType === 'OTHER' ? (input.otherOrganName ?? null) : null,
      procurementDate: parseDateOnly(input.procurementDate),
      notes: input.notes ?? null,
      status: 'PENDING',
    },
    select: ownOrganSelect,
  });
  await recordCreated(prisma, { entityType: 'ORGAN', entityId: organ.id, toStatus: 'PENDING' });
  return toOwnOrgan(organ);
}

// ---------------------------------------------------------------- Admin

export async function listForAdmin(query: AdminListOrgansQuery) {
  const where: Prisma.OrganWhereInput = {
    organType: query.organType,
    status: query.status,
    hospitalId: query.hospitalId,
    ...(query.q
      ? {
          OR: [
            { donor: { donorCode: { contains: query.q, mode: 'insensitive' } } },
            { donor: { firstName: { contains: query.q, mode: 'insensitive' } } },
            { donor: { lastName: { contains: query.q, mode: 'insensitive' } } },
            { hospital: { name: { contains: query.q, mode: 'insensitive' } } },
            { hospital: { city: { contains: query.q, mode: 'insensitive' } } },
            { otherOrganName: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.organ.findMany({ where, select: adminOrganSelect, orderBy: { createdAt: 'desc' }, ...pageArgs(query.page, query.pageSize) }),
    prisma.organ.count({ where }),
  ]);
  return { items: rows.map(toAdminOrgan), meta: buildPageMeta(query.page, query.pageSize, total) };
}

/** Legacy POST /auth/addorgan: admin enters a Donor ID, organ, hospital and procurement date. */
export async function createForAdmin(input: AdminCreateOrganInput) {
  const donor = await prisma.donor.findUnique({ where: { donorCode: input.donorCode }, select: { id: true, status: true } });
  if (!donor) throw AppError.badRequest('No donor exists with this Donor ID', fieldErrors(['donorCode', 'No donor exists with this Donor ID']));
  if (donor.status === 'WITHDRAWN' && input.status !== 'UNAVAILABLE') {
    throw AppError.conflict(
      'This donor has withdrawn. Reactivate the donor first or record the organ as unavailable.',
      fieldErrors(['donorCode', 'Donor has withdrawn']),
    );
  }
  await assertHospital(input.hospitalId);

  const organ = await prisma.organ.create({
    data: {
      donorId: donor.id,
      hospitalId: input.hospitalId,
      organType: input.organType,
      otherOrganName: input.organType === 'OTHER' ? (input.otherOrganName ?? null) : null,
      procurementDate: parseDateOnly(input.procurementDate),
      notes: input.notes ?? null,
      status: input.status,
    },
    select: adminOrganSelect,
  });
  await recordCreated(prisma, { entityType: 'ORGAN', entityId: organ.id, toStatus: organ.status });
  return toAdminOrgan(organ);
}

export async function updateForAdmin(organId: string, input: AdminUpdateOrganInput, actorId: string | null) {
  const existing = await prisma.organ.findUnique({ where: { id: organId }, select: { organType: true, status: true } });
  if (!existing) throw AppError.notFound('Organ');
  if (input.hospitalId) await assertHospital(input.hospitalId);

  const organType = input.organType ?? existing.organType;
  const organ = await prisma.organ.update({
    where: { id: organId },
    data: {
      organType: input.organType,
      otherOrganName: organType === 'OTHER' ? input.otherOrganName : null,
      hospitalId: input.hospitalId,
      procurementDate: input.procurementDate ? parseDateOnly(input.procurementDate) : undefined,
      notes: input.notes,
      status: input.status,
    },
    select: adminOrganSelect,
  });
  if (input.status) {
    await recordStatusChanged(prisma, {
      entityType: 'ORGAN',
      entityId: organ.id,
      fromStatus: existing.status,
      toStatus: input.status,
      actorId,
    });
  }
  return toAdminOrgan(organ);
}

export async function deleteForAdmin(organId: string) {
  const existing = await prisma.organ.findUnique({ where: { id: organId }, select: { id: true } });
  if (!existing) throw AppError.notFound('Organ');
  await prisma.organ.delete({ where: { id: organId } });
}
