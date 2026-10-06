import { randomInt } from 'node:crypto';
import { prisma } from '../lib/prisma';
import type { CreatePledgeInput } from '../schemas/pledge.schema';
import { AppError } from '../utils/errors';

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid ambiguity

function generateReferenceId(): string {
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `PLG-${suffix}`;
}

export const pledgeSelect = {
  id: true,
  referenceId: true,
  fullName: true,
  email: true,
  city: true,
  organPreference: true,
  consentedAt: true,
  createdAt: true,
} satisfies import('@prisma/client').Prisma.PledgeSelect;

function toPledge(p: { referenceId: string; fullName: string; city: string; organPreference: string; createdAt: Date }) {
  return {
    referenceId: p.referenceId,
    fullName: p.fullName,
    city: p.city,
    organPreference: p.organPreference,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Public, no-account pledge. Never creates a User/Donor row - see prisma/schema.prisma's Pledge doc comment. */
export async function create(input: CreatePledgeInput) {
  // Collision odds are astronomically low (32^8 space) but retry once defensively rather than
  // letting a unique-constraint error surface as a raw 500.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const referenceId = generateReferenceId();
      const pledge = await prisma.pledge.create({
        data: {
          referenceId,
          fullName: input.fullName,
          email: input.email,
          city: input.city,
          organPreference: input.organPreference,
          consentedAt: new Date(),
        },
        select: pledgeSelect,
      });
      return toPledge(pledge);
    } catch (err) {
      const isUniqueConflict = typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002';
      if (!isUniqueConflict || attempt === 2) throw err;
    }
  }
  throw new Error('unreachable');
}

/** Looked up for the certificate download - no auth, but only returns what the certificate itself shows (no email). */
export async function getByReferenceId(referenceId: string) {
  const pledge = await prisma.pledge.findUnique({ where: { referenceId }, select: pledgeSelect });
  if (!pledge) throw AppError.notFound('Pledge');
  return pledge;
}
