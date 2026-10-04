import type { OrganType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { HospitalInput, ListHospitalsQuery, UpdateHospitalInput } from '../schemas/hospital.schema';
import { AppError } from '../utils/errors';
import { buildPageMeta, pageArgs } from '../utils/response';
import { hospitalSummarySelect, toHospitalSummary } from './mappers';

type AvailabilityByType = Array<{ organType: OrganType; count: number }>;

async function availabilityFor(hospitalIds: string[]): Promise<Map<string, AvailabilityByType>> {
  const map = new Map<string, AvailabilityByType>();
  if (hospitalIds.length === 0) return map;
  const grouped = await prisma.organ.groupBy({
    by: ['hospitalId', 'organType'],
    where: { hospitalId: { in: hospitalIds }, status: 'AVAILABLE' },
    _count: { _all: true },
  });
  for (const g of grouped) {
    const list = map.get(g.hospitalId) ?? [];
    list.push({ organType: g.organType, count: g._count._all });
    map.set(g.hospitalId, list);
  }
  for (const list of map.values()) list.sort((a, b) => b.count - a.count);
  return map;
}

/** Public hospital directory (legacy hospitaldetails table) with live availability counts. */
export async function listHospitals(query: ListHospitalsQuery) {
  const where: Prisma.HospitalWhereInput = {
    ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { city: { contains: query.q, mode: 'insensitive' } },
            { address: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.hospital.findMany({
      where,
      select: hospitalSummarySelect,
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
      ...pageArgs(query.page, query.pageSize),
    }),
    prisma.hospital.count({ where }),
  ]);

  const availability = await availabilityFor(rows.map((r) => r.id));
  const items = rows.map((h) => {
    const byType = availability.get(h.id) ?? [];
    return {
      ...toHospitalSummary(h),
      availableOrganCount: byType.reduce((sum, t) => sum + t.count, 0),
      availableByType: byType,
    };
  });

  return { items, meta: buildPageMeta(query.page, query.pageSize, total) };
}

export async function getHospital(id: string) {
  const hospital = await prisma.hospital.findUnique({ where: { id }, select: hospitalSummarySelect });
  if (!hospital) throw AppError.notFound('Hospital');
  const byType = (await availabilityFor([id])).get(id) ?? [];
  return {
    ...toHospitalSummary(hospital),
    availableOrganCount: byType.reduce((sum, t) => sum + t.count, 0),
    availableByType: byType,
  };
}

/** Minimal list for form selects (registration, add-organ). */
export async function listHospitalOptions() {
  return prisma.hospital.findMany({
    select: { id: true, name: true, city: true },
    orderBy: [{ name: 'asc' }, { city: 'asc' }],
  });
}

export async function listCities(): Promise<string[]> {
  const rows = await prisma.hospital.findMany({ distinct: ['city'], select: { city: true }, orderBy: { city: 'asc' } });
  return rows.map((r) => r.city);
}

// ---------------------------------------------------------------- Admin

export async function createHospital(input: HospitalInput) {
  const hospital = await prisma.hospital.create({
    data: {
      name: input.name,
      city: input.city,
      state: input.state ?? null,
      address: input.address,
      phone: input.phone,
      email: input.email ?? null,
    },
    select: hospitalSummarySelect,
  });
  return toHospitalSummary(hospital);
}

export async function updateHospital(id: string, input: UpdateHospitalInput) {
  const existing = await prisma.hospital.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw AppError.notFound('Hospital');
  const hospital = await prisma.hospital.update({ where: { id }, data: input, select: hospitalSummarySelect });
  return toHospitalSummary(hospital);
}

export async function deleteHospital(id: string) {
  const hospital = await prisma.hospital.findUnique({
    where: { id },
    select: { id: true, _count: { select: { organs: true } } },
  });
  if (!hospital) throw AppError.notFound('Hospital');
  if (hospital._count.organs > 0) {
    throw AppError.conflict(
      `This hospital has ${hospital._count.organs} organ record(s). Reassign or remove them before deleting the hospital.`,
    );
  }
  // Donors that listed this hospital keep their account; the FK is set to NULL.
  await prisma.hospital.delete({ where: { id } });
}
