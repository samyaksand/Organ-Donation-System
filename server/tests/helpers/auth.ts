import type { Role } from '@prisma/client';
import { signToken } from '../../src/utils/jwt';
import type { PrismaMock } from './prisma-mock';

export const donorUser = {
  id: 'user_donor',
  email: 'donor@example.com',
  role: 'DONOR' as Role,
  donor: { id: 'donor_1', donorCode: 'DNTEST01', firstName: 'Test', lastName: 'Donor', status: 'ACTIVE' as const },
  admin: null,
};

export const adminUser = {
  id: 'user_admin',
  email: 'admin@example.com',
  role: 'ADMIN' as Role,
  donor: null,
  admin: { id: 'admin_1', displayName: 'Test Admin' },
};

export const superAdminUser = {
  id: 'user_super_admin',
  email: 'super@example.com',
  role: 'SUPER_ADMIN' as Role,
  donor: null,
  admin: { id: 'admin_super_1', displayName: 'Test Super Admin' },
};

/** Cookie header for a signed-in user; also primes requireAuth's user lookup. */
export function authCookie(prisma: PrismaMock, user: typeof donorUser | typeof adminUser | typeof superAdminUser) {
  prisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; email?: string } }) => {
    if (args.where.id === user.id || args.where.email === user.email) return user;
    return null;
  });
  return `ods_token=${signToken({ sub: user.id, role: user.role })}`;
}
