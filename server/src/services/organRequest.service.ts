import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { CreateOrganRequestInput, ListOrganRequestsQuery, ReviewOrganRequestInput } from '../schemas/organRequest.schema';
import { AppError, fieldErrors } from '../utils/errors';
import { buildPageMeta, pageArgs } from '../utils/response';
import { organRequestSelect, toOrganRequest } from './mappers';
import { getWorkflowHistory, recordCreated, recordStatusChanged } from './workflowEvent.service';

/**
 * Admin creates a request on behalf of a hospital for one specific, currently AVAILABLE organ.
 * There is no hospital login in this system, so the admin enters it (mirrors how organs and
 * hospitals themselves are admin-managed records, not self-service). At most one active
 * (PENDING) request per organ is allowed, checked inside a serializable transaction so two
 * concurrent requests for the same organ cannot both succeed.
 */
export async function create(adminId: string, input: CreateOrganRequestInput) {
  const created = await prisma.$transaction(
    async (tx) => {
      const organ = await tx.organ.findUnique({ where: { id: input.organId }, select: { id: true, status: true } });
      if (!organ) throw AppError.badRequest('Selected organ does not exist', fieldErrors(['organId', 'Select a valid organ']));
      if (organ.status !== 'AVAILABLE') {
        throw AppError.conflict('This organ is not currently available to request.', fieldErrors(['organId', 'Organ is not available']));
      }

      const hospital = await tx.hospital.findUnique({ where: { id: input.hospitalId }, select: { id: true } });
      if (!hospital) {
        throw AppError.badRequest('Selected hospital does not exist', fieldErrors(['hospitalId', 'Select a valid hospital']));
      }

      const existingActive = await tx.organRequest.findFirst({
        where: { organId: input.organId, status: 'PENDING' },
        select: { id: true },
      });
      if (existingActive) {
        throw AppError.conflict('This organ already has a pending request awaiting review.');
      }

      const request = await tx.organRequest.create({
        data: {
          organId: input.organId,
          hospitalId: input.hospitalId,
          notes: input.notes ?? null,
          requestedById: adminId,
        },
        select: organRequestSelect,
      });
      await recordCreated(tx, { entityType: 'ORGAN_REQUEST', entityId: request.id, toStatus: 'PENDING', actorId: adminId });
      return request;
    },
    { isolationLevel: 'Serializable' },
  );
  return toOrganRequest(created);
}

export async function list(query: ListOrganRequestsQuery) {
  const where: Prisma.OrganRequestWhereInput = {
    status: query.status,
    hospitalId: query.hospitalId,
    ...(query.q
      ? {
          OR: [
            { hospital: { name: { contains: query.q, mode: 'insensitive' } } },
            { hospital: { city: { contains: query.q, mode: 'insensitive' } } },
            { organ: { donor: { donorCode: { contains: query.q, mode: 'insensitive' } } } },
            { organ: { otherOrganName: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.organRequest.findMany({
      where,
      select: organRequestSelect,
      // Pending first, then newest - same convention as withdrawal requests.
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      ...pageArgs(query.page, query.pageSize),
    }),
    prisma.organRequest.count({ where }),
  ]);
  return { items: rows.map(toOrganRequest), meta: buildPageMeta(query.page, query.pageSize, total) };
}

export async function getById(id: string) {
  const row = await prisma.organRequest.findUnique({ where: { id }, select: organRequestSelect });
  if (!row) throw AppError.notFound('Organ request');
  return toOrganRequest(row);
}

/**
 * Approve or decline a pending request. Approval atomically marks the organ UNAVAILABLE
 * (allocated to the requesting hospital) alongside the request's own status change - both
 * succeed or both roll back. Declining never touches the organ's availability. Re-reviewing an
 * already-decided request, or reviewing a request whose organ is no longer AVAILABLE (e.g. it
 * was allocated to a different request, or withdrawn), is rejected rather than silently
 * producing an inconsistent state.
 */
export async function review(id: string, adminId: string, input: ReviewOrganRequestInput) {
  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.organRequest.findUnique({
      where: { id },
      select: { status: true, organId: true },
    });
    if (!request) throw AppError.notFound('Organ request');
    if (request.status !== 'PENDING') throw AppError.conflict('This request has already been reviewed.');

    if (input.status === 'APPROVED') {
      const organ = await tx.organ.findUnique({ where: { id: request.organId }, select: { status: true } });
      if (!organ || organ.status !== 'AVAILABLE') {
        throw AppError.conflict('This organ is no longer available and cannot be allocated to this request.');
      }
      await tx.organ.update({ where: { id: request.organId }, data: { status: 'UNAVAILABLE' } });
      await recordStatusChanged(tx, {
        entityType: 'ORGAN',
        entityId: request.organId,
        fromStatus: 'AVAILABLE',
        toStatus: 'UNAVAILABLE',
        actorId: adminId,
      });
    }

    const reviewed = await tx.organRequest.update({
      where: { id },
      data: {
        status: input.status,
        declineReason: input.status === 'DECLINED' ? (input.declineReason ?? null) : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      select: organRequestSelect,
    });
    await recordStatusChanged(tx, {
      entityType: 'ORGAN_REQUEST',
      entityId: id,
      fromStatus: 'PENDING',
      toStatus: input.status,
      actorId: adminId,
    });
    return reviewed;
  });
  return toOrganRequest(updated);
}

/**
 * The request's own WorkflowEvent history (CREATED + its eventual STATUS_CHANGED), reusing the
 * existing WorkflowEvent table - not a second audit system. Kept scoped to one request's own
 * events rather than a general cross-entity history endpoint.
 */
export async function getHistory(id: string) {
  const exists = await prisma.organRequest.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw AppError.notFound('Organ request');
  return getWorkflowHistory('ORGAN_REQUEST', id);
}

/** Withdraw a request before it's been decided. Never touches the organ's availability. */
export async function cancel(id: string, adminId: string) {
  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.organRequest.findUnique({ where: { id }, select: { status: true } });
    if (!request) throw AppError.notFound('Organ request');
    if (request.status !== 'PENDING') throw AppError.conflict('Only a pending request can be cancelled.');

    const cancelled = await tx.organRequest.update({
      where: { id },
      data: { status: 'CANCELLED', reviewedById: adminId, reviewedAt: new Date() },
      select: organRequestSelect,
    });
    await recordStatusChanged(tx, {
      entityType: 'ORGAN_REQUEST',
      entityId: id,
      fromStatus: 'PENDING',
      toStatus: 'CANCELLED',
      actorId: adminId,
    });
    return cancelled;
  });
  return toOrganRequest(updated);
}
