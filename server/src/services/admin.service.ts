import type { DonorStatus, OrganStatus, OrganType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ORGAN_TYPES } from '../schemas/common';
import { adminWithdrawalSelect, donorListSelect, toAdminWithdrawal, toDonorListItem } from './mappers';

/** Admin dashboard overview - all figures are live counts from the database. */
export async function getOverview() {
  const [
    donorsByStatus,
    organsByStatus,
    availableByType,
    hospitalCount,
    pendingWithdrawals,
    pendingOrganRequests,
    recentDonors,
    recentWithdrawals,
  ] = await Promise.all([
    prisma.donor.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.organ.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.organ.groupBy({ by: ['organType'], where: { status: 'AVAILABLE' }, _count: { _all: true } }),
    prisma.hospital.count(),
    prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    prisma.organRequest.count({ where: { status: 'PENDING' } }),
    prisma.donor.findMany({ select: donorListSelect, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
      select: adminWithdrawalSelect,
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const donors: Record<DonorStatus, number> = { PENDING: 0, ACTIVE: 0, WITHDRAWN: 0 };
  for (const g of donorsByStatus) donors[g.status] = g._count._all;

  const organs: Record<OrganStatus, number> = { PENDING: 0, AVAILABLE: 0, UNAVAILABLE: 0 };
  for (const g of organsByStatus) organs[g.status] = g._count._all;

  const typeCounts = new Map<OrganType, number>(availableByType.map((g) => [g.organType, g._count._all]));

  return {
    donors: { ...donors, total: donors.PENDING + donors.ACTIVE + donors.WITHDRAWN },
    organs: { ...organs, total: organs.PENDING + organs.AVAILABLE + organs.UNAVAILABLE },
    availableByType: ORGAN_TYPES.map((organType) => ({ organType, count: typeCounts.get(organType) ?? 0 })),
    hospitalCount,
    pendingWithdrawals,
    pendingOrganRequests,
    recentDonors: recentDonors.map(toDonorListItem),
    recentWithdrawals: recentWithdrawals.map(toAdminWithdrawal),
  };
}
