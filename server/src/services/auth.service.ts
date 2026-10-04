import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { ChangePasswordInput, LoginInput, RegisterInput } from '../schemas/auth.schema';
import { parseDateOnly } from '../utils/dates';
import { generateDonorCode } from '../utils/donorCode';
import { AppError, fieldErrors } from '../utils/errors';

const EMAIL_TAKEN = 'An account with this email already exists';
import { signToken } from '../utils/jwt';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../utils/password';

const sessionUserSelect = {
  id: true,
  email: true,
  role: true,
  donor: { select: { id: true, donorCode: true, firstName: true, lastName: true, status: true } },
  admin: { select: { id: true, displayName: true } },
} satisfies Prisma.UserSelect;

type SessionUserRow = Prisma.UserGetPayload<{ select: typeof sessionUserSelect }>;

export type SessionUser = ReturnType<typeof toSessionUser>;

function toSessionUser(u: SessionUserRow) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    donor: u.donor,
    admin: u.admin,
  };
}

function isUniqueViolation(err: unknown, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;
  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target : [String(target ?? '')];
  return fields.some((f) => String(f).includes(field));
}

/** Donor self-registration (legacy POST /auth/register). Creates User + Donor + NextOfKin atomically. */
export async function registerDonor(input: RegisterInput): Promise<{ user: SessionUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw AppError.conflict(EMAIL_TAKEN, fieldErrors(['email', EMAIL_TAKEN]));

  if (input.hospitalId) {
    const hospital = await prisma.hospital.findUnique({ where: { id: input.hospitalId }, select: { id: true } });
    if (!hospital) throw AppError.badRequest('Selected hospital does not exist', fieldErrors(['hospitalId', 'Select a valid hospital']));
  }

  const passwordHash = await hashPassword(input.password);

  // donorCode is random; retry on the (very unlikely) collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: 'DONOR',
          lastLoginAt: new Date(),
          donor: {
            create: {
              donorCode: generateDonorCode(),
              firstName: input.firstName,
              lastName: input.lastName,
              gender: input.gender,
              dateOfBirth: parseDateOnly(input.dateOfBirth),
              phone: input.phone,
              address: input.address,
              city: input.city,
              state: input.state,
              personalDoctor: input.personalDoctor ?? null,
              medicalConditions: input.medicalConditions ?? null,
              hospitalId: input.hospitalId ?? null,
              nextOfKin: {
                create: {
                  name: input.nextOfKin.name,
                  phone: input.nextOfKin.phone,
                  relationship: input.nextOfKin.relationship ?? null,
                },
              },
            },
          },
        },
        select: sessionUserSelect,
      });
      return { user: toSessionUser(user), token: signToken({ sub: user.id, role: user.role }) };
    } catch (err) {
      if (isUniqueViolation(err, 'donor_code')) continue;
      if (isUniqueViolation(err, 'email')) {
        throw AppError.conflict(EMAIL_TAKEN, fieldErrors(['email', EMAIL_TAKEN]));
      }
      throw err;
    }
  }
  throw new AppError(500, 'INTERNAL_ERROR', 'Could not allocate a Donor ID. Please try again.');
}

/**
 * Login for both roles (legacy /auth/logind by email and /auth/loginad by AdminID).
 * Admin passwords are now bcrypt hashes like everyone else's — the legacy plaintext comparison is gone.
 */
export async function login(input: LoginInput): Promise<{ user: SessionUser; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...sessionUserSelect, passwordHash: true },
  });

  if (!user) {
    await burnPasswordCheck(input.password);
    throw AppError.invalidCredentials();
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw AppError.invalidCredentials();

  // Signing in through the wrong portal is treated like bad credentials (does not reveal the role).
  if (input.portal && input.portal !== user.role) throw AppError.invalidCredentials();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const { passwordHash: _omit, ...safe } = user;
  return { user: toSessionUser(safe), token: signToken({ sub: user.id, role: user.role }) };
}

export async function getSessionUser(userId: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: sessionUserSelect });
  if (!user) throw AppError.unauthenticated();
  return toSessionUser(user);
}

/** Password change for the signed-in user (legacy dupdate field=Password, now requires the current password). */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw AppError.unauthenticated();

  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Current password is incorrect', {
      fields: [{ path: 'currentPassword', message: 'Current password is incorrect' }],
    });
  }

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } });
}
