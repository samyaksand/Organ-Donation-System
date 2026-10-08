import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

import { evaluateAccess } from '../src/security/policyEngine';

describe('security/policyEngine.ts - evaluateAccess (RBAC + ownership + ABAC)', () => {
  it('ALLOWs a donor viewing their own profile (ownership matches)', () => {
    const result = evaluateAccess({
      role: 'DONOR',
      donorId: 'donor_1',
      resource: 'donor-profile',
      action: 'VIEW',
      resourceOwnerId: 'donor_1',
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.ownershipCheck.applicable).toBe(true);
    expect(result.ownershipCheck.passed).toBe(true);
  });

  it('DENIEs a donor viewing another donor\'s profile (ownership fails)', () => {
    const result = evaluateAccess({
      role: 'DONOR',
      donorId: 'donor_1',
      resource: 'donor-profile',
      action: 'VIEW',
      resourceOwnerId: 'donor_2',
    });
    expect(result.decision).toBe('DENY');
    expect(result.ownershipCheck.passed).toBe(false);
  });

  it('DENIEs a donor viewing another donor\'s medical information (sensitive + ownership fails)', () => {
    const result = evaluateAccess({
      role: 'DONOR',
      donorId: 'donor_1',
      resource: 'donor-medical-info',
      action: 'VIEW',
      resourceOwnerId: 'donor_2',
    });
    expect(result.decision).toBe('DENY');
    expect(result.classification).toBe('SENSITIVE');
  });

  it('ALLOWs the public to view organ availability (public resource)', () => {
    const result = evaluateAccess({ role: 'PUBLIC', resource: 'organ-availability', action: 'VIEW' });
    expect(result.decision).toBe('ALLOW');
    expect(result.classification).toBe('PUBLIC');
  });

  it('DENIEs the public from viewing admin donor records (protected/sensitive resource)', () => {
    const result = evaluateAccess({ role: 'PUBLIC', resource: 'admin-donor-records', action: 'VIEW' });
    expect(result.decision).toBe('DENY');
  });

  it('DENIEs a donor from viewing admin-only resources regardless of ownership context', () => {
    const result = evaluateAccess({ role: 'DONOR', donorId: 'donor_1', resource: 'admin-donor-records', action: 'VIEW' });
    expect(result.decision).toBe('DENY');
  });

  it('ALLOWs an admin to view admin donor records (role-scoped, not ownership-scoped)', () => {
    const result = evaluateAccess({ role: 'ADMIN', resource: 'admin-donor-records', action: 'VIEW' });
    expect(result.decision).toBe('ALLOW');
    expect(result.ownershipCheck.applicable).toBe(false);
  });

  it('SUPER_ADMIN inherits ADMIN policies', () => {
    const result = evaluateAccess({ role: 'SUPER_ADMIN', resource: 'admin-analytics', action: 'VIEW' });
    expect(result.decision).toBe('ALLOW');
  });

  it('fails closed (DENY) for a role/resource/action combination with no matching policy', () => {
    const result = evaluateAccess({ role: 'DONOR', resource: 'security-admin', action: 'VIEW' });
    expect(result.decision).toBe('DENY');
    expect(result.policyCode).toBe('no-matching-policy');
  });

  it('always returns a role check, ownership check, and contextual check with explanatory detail', () => {
    const result = evaluateAccess({ role: 'ADMIN', resource: 'admin-analytics', action: 'VIEW' });
    expect(result.roleCheck.detail).toBeTruthy();
    expect(result.contextualCheck.detail).toBeTruthy();
    expect(result.reason).toBeTruthy();
  });
});
