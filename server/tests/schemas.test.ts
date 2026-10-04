import { describe, expect, it } from 'vitest';
import { registerSchema } from '../src/schemas/auth.schema';
import { adminUpdateDonorSchema, updateOwnProfileSchema } from '../src/schemas/donor.schema';
import { adminCreateOrganSchema, donorCreateOrganSchema, publicOrganSearchQuery } from '../src/schemas/organ.schema';
import { createWithdrawalSchema } from '../src/schemas/withdrawal.schema';

describe('field whitelisting (replaces legacy SQL column interpolation)', () => {
  // Legacy /auth/update and /auth/dupdate did: 'UPDATE donor SET ' + req.body.field + ' = ? ...'
  it.each([
    [{ 'Contact = 1, Password': 'x' }],
    [{ passwordHash: 'x' }],
    [{ status: 'ACTIVE' }],
    [{ donorCode: 'DN000000' }],
    [{ email: 'new@example.com' }],
  ])('donor self-update rejects non-whitelisted key %j', (body) => {
    expect(updateOwnProfileSchema.safeParse(body).success).toBe(false);
  });

  it('donor self-update accepts whitelisted fields and turns blank optionals into null', () => {
    const parsed = updateOwnProfileSchema.parse({ phone: '+91 98765 43210', personalDoctor: '  ', medicalConditions: 'Asthma' });
    expect(parsed).toEqual({ phone: '+91 98765 43210', personalDoctor: null, medicalConditions: 'Asthma' });
  });

  it('donor self-update requires at least one field', () => {
    expect(updateOwnProfileSchema.safeParse({}).success).toBe(false);
  });

  it('admin donor update only allows email/phone/medicalConditions/status', () => {
    expect(adminUpdateDonorSchema.safeParse({ email: 'A@Example.com' }).data).toEqual({ email: 'a@example.com' });
    expect(adminUpdateDonorSchema.safeParse({ role: 'ADMIN' }).success).toBe(false);
    expect(adminUpdateDonorSchema.safeParse({ password: 'x' }).success).toBe(false);
  });
});

describe('organ schemas', () => {
  const base = { organType: 'KIDNEY', hospitalId: 'h1', procurementDate: '2026-08-01' };

  it('accepts every supported organ type', () => {
    for (const organType of ['KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA']) {
      expect(donorCreateOrganSchema.safeParse({ ...base, organType }).success).toBe(true);
    }
  });

  it('requires a name when organType is OTHER', () => {
    expect(donorCreateOrganSchema.safeParse({ ...base, organType: 'OTHER' }).success).toBe(false);
    expect(donorCreateOrganSchema.safeParse({ ...base, organType: 'OTHER', otherOrganName: 'Skin' }).success).toBe(true);
  });

  it('rejects free-text organ names and invalid dates', () => {
    expect(donorCreateOrganSchema.safeParse({ ...base, organType: 'kidney ' }).success).toBe(false);
    expect(donorCreateOrganSchema.safeParse({ ...base, procurementDate: '01/08/2026' }).success).toBe(false);
  });

  it('donors cannot set the organ status themselves', () => {
    expect(donorCreateOrganSchema.safeParse({ ...base, status: 'AVAILABLE' }).success).toBe(false);
  });

  it('admin create normalises the Donor ID and defaults status to AVAILABLE', () => {
    const parsed = adminCreateOrganSchema.parse({ ...base, donorCode: ' dnabc123 ' });
    expect(parsed.donorCode).toBe('DNABC123');
    expect(parsed.status).toBe('AVAILABLE');
  });

  it('public search defaults to AVAILABLE and never accepts PENDING', () => {
    expect(publicOrganSearchQuery.parse({}).availability).toBe('AVAILABLE');
    expect(publicOrganSearchQuery.safeParse({ availability: 'PENDING' }).success).toBe(false);
  });
});

describe('registration & withdrawal rules', () => {
  const valid = {
    email: 'a@example.com',
    password: 'abcdefg1',
    confirmPassword: 'abcdefg1',
    firstName: 'A',
    lastName: 'B',
    gender: 'OTHER',
    dateOfBirth: '1990-01-01',
    phone: '+91 98765 43210',
    address: 'x',
    city: 'y',
    state: 'z',
    nextOfKin: { name: 'K', phone: '+91 91234 56789' },
  };

  it('enforces the password policy', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short1', confirmPassword: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: 'lettersonly', confirmPassword: 'lettersonly' }).success).toBe(false);
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a future date of birth', () => {
    expect(registerSchema.safeParse({ ...valid, dateOfBirth: '2999-01-01' }).success).toBe(false);
  });

  it('requires next of kin details at signup (legacy nextofkin row)', () => {
    const { nextOfKin: _omit, ...withoutKin } = valid;
    expect(registerSchema.safeParse(withoutKin).success).toBe(false);
  });

  it('requires a meaningful withdrawal reason', () => {
    expect(createWithdrawalSchema.safeParse({ reason: 'no' }).success).toBe(false);
    expect(createWithdrawalSchema.safeParse({ reason: 'Moving abroad permanently' }).success).toBe(true);
  });
});
