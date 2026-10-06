/**
 * Thin helper around WorkflowEvent (see prisma/schema.prisma for why it exists). Called only
 * from the services that already perform a real status transition or creation on Donor, Organ,
 * or WithdrawalRequest - never a new/parallel write path, and never from a route/controller
 * directly. Writes are fire-and-forget relative to the caller's main transaction result: a
 * logging failure must not take down a real donor/organ/withdrawal mutation that already
 * succeeded, so callers should not await this inside the same transaction that must commit the
 * primary change (see services for the exact call sites).
 */
import type { WorkflowEntityType } from '@prisma/client';
import { prisma } from '../lib/prisma';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface RecordEventInput {
  entityType: WorkflowEntityType;
  entityId: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
}

/** Record a CREATED event. `tx` lets this join the same transaction as the row's own creation. */
export async function recordCreated(tx: TxClient | typeof prisma, input: Omit<RecordEventInput, 'fromStatus'>) {
  await tx.workflowEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: 'CREATED',
      toStatus: input.toStatus ?? null,
      actorId: input.actorId ?? null,
    },
  });
}

/** Record a STATUS_CHANGED event. No-ops when `fromStatus === toStatus` (not a real transition). */
export async function recordStatusChanged(tx: TxClient | typeof prisma, input: RecordEventInput) {
  if (input.fromStatus === input.toStatus) return;
  await tx.workflowEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: 'STATUS_CHANGED',
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      actorId: input.actorId ?? null,
    },
  });
}

/**
 * Read-only: reconstructs one entity's recorded history (CREATED + any STATUS_CHANGED rows),
 * oldest first. Generalizes organRequest.service.ts's `getHistory` to all four entity types so
 * it can back both the UI's per-request timeline and the Operations Intelligence Agent's
 * `getWorkflowHistory` tool from a single implementation.
 */
export async function getWorkflowHistory(entityType: WorkflowEntityType, entityId: string) {
  const events = await prisma.workflowEvent.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, eventType: true, fromStatus: true, toStatus: true, actorId: true, createdAt: true },
  });

  const actorIds = [...new Set(events.map((e) => e.actorId).filter((v): v is string => Boolean(v)))];
  const admins = actorIds.length
    ? await prisma.admin.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true } })
    : [];
  const nameById = new Map(admins.map((a) => [a.id, a.displayName]));

  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    actor: e.actorId ? (nameById.get(e.actorId) ?? null) : null,
    createdAt: e.createdAt.toISOString(),
  }));
}
