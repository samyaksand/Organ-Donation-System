import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type {
  CreateWithdrawalInput,
  ListWithdrawalsQuery,
  ReviewWithdrawalInput,
} from '../schemas/withdrawal.schema';
import { AppError } from '../utils/errors';
import { buildPageMeta, pageArgs } from '../utils/response';
import { adminWithdrawalSelect, toAdminWithdrawal, toWithdrawal, withdrawalSelect } from './mappers';
import { getWorkflowHistory, recordCreated, recordStatusChanged } from './workflowEvent.service';

export async function listOwn(donorId: string) {
  const rows = await prisma.withdrawalRequest.findMany({
    where: { donorId },
    select: withdrawalSelect,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toWithdrawal);
}

/**
 * Donor submits a withdrawal request (legacy POST /auth/withdraw -> deletionreason).
 * At most one PENDING request per donor; checked inside a serializable transaction.
 */
export async function createOwn(donorId: string, input: CreateWithdrawalInput) {
  const created = await prisma.$transaction(
    async (tx) => {
      const donor = await tx.donor.findUnique({ where: { id: donorId }, select: { status: true } });
      if (!donor) throw AppError.notFound('Donor');
      if (donor.status === 'WITHDRAWN') throw AppError.conflict('Your registration is already withdrawn.');

      const pending = await tx.withdrawalRequest.findFirst({
        where: { donorId, status: 'PENDING' },
        select: { id: true },
      });
      if (pending) throw AppError.conflict('You already have a withdrawal request awaiting review.');

      const request = await tx.withdrawalRequest.create({
        data: { donorId, reason: input.reason },
        select: withdrawalSelect,
      });
      await recordCreated(tx, { entityType: 'WITHDRAWAL_REQUEST', entityId: request.id, toStatus: 'PENDING' });
      return request;
    },
    { isolationLevel: 'Serializable' },
  );
  return toWithdrawal(created);
}

// ---------------------------------------------------------------- Admin

export async function listForAdmin(query: ListWithdrawalsQuery) {
  const where: Prisma.WithdrawalRequestWhereInput = {
    status: query.status,
    ...(query.q
      ? {
          OR: [
            { reason: { contains: query.q, mode: 'insensitive' } },
            { donor: { donorCode: { contains: query.q, mode: 'insensitive' } } },
            { donor: { firstName: { contains: query.q, mode: 'insensitive' } } },
            { donor: { lastName: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.withdrawalRequest.findMany({
      where,
      select: adminWithdrawalSelect,
      // Pending first, then newest.
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      ...pageArgs(query.page, query.pageSize),
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);
  return { items: rows.map(toAdminWithdrawal), meta: buildPageMeta(query.page, query.pageSize, total) };
}

/**
 * Approve or reject a pending request. Approval marks the donor WITHDRAWN and takes their
 * PENDING/AVAILABLE organs out of circulation (UNAVAILABLE). Deleting the donor's records
 * entirely remains a separate, explicit admin action (Donor Management -> Delete).
 */
export async function review(id: string, adminId: string, input: ReviewWithdrawalInput) {
  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.findUnique({ where: { id }, select: { status: true, donorId: true } });
    if (!request) throw AppError.notFound('Withdrawal request');
    if (request.status !== 'PENDING') throw AppError.conflict('This request has already been reviewed.');

    if (input.status === 'APPROVED') {
      const donorBefore = await tx.donor.findUnique({ where: { id: request.donorId }, select: { status: true } });
      await tx.donor.update({ where: { id: request.donorId }, data: { status: 'WITHDRAWN' } });
      await recordStatusChanged(tx, {
        entityType: 'DONOR',
        entityId: request.donorId,
        fromStatus: donorBefore?.status,
        toStatus: 'WITHDRAWN',
        actorId: adminId,
      });

      const affectedOrgans = await tx.organ.findMany({
        where: { donorId: request.donorId, status: { in: ['PENDING', 'AVAILABLE'] } },
        select: { id: true, status: true },
      });
      await tx.organ.updateMany({
        where: { donorId: request.donorId, status: { in: ['PENDING', 'AVAILABLE'] } },
        data: { status: 'UNAVAILABLE' },
      });
      for (const organ of affectedOrgans) {
        await recordStatusChanged(tx, {
          entityType: 'ORGAN',
          entityId: organ.id,
          fromStatus: organ.status,
          toStatus: 'UNAVAILABLE',
          actorId: adminId,
        });
      }
    }

    const reviewed = await tx.withdrawalRequest.update({
      where: { id },
      data: {
        status: input.status,
        adminNote: input.adminNote ?? null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      select: adminWithdrawalSelect,
    });
    await recordStatusChanged(tx, {
      entityType: 'WITHDRAWAL_REQUEST',
      entityId: id,
      fromStatus: 'PENDING',
      toStatus: input.status,
      actorId: adminId,
    });
    return reviewed;
  });
  return toAdminWithdrawal(updated);
}

/** Admin-only workflow timeline for one withdrawal request - reuses the shared WorkflowEvent history. */
export async function getHistory(id: string) {
  const exists = await prisma.withdrawalRequest.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw AppError.notFound('Withdrawal request');
  return getWorkflowHistory('WITHDRAWAL_REQUEST', id);
}
