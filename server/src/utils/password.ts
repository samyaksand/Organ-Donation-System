import bcrypt from 'bcryptjs';

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Lazily computed real hash, compared against when the email does not exist so the
// response time of "unknown email" matches "wrong password" (no account enumeration).
let dummyHash: Promise<string> | undefined;

export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= bcrypt.hash('timing-equalizer-not-a-real-password', COST);
  await bcrypt.compare(plain, await dummyHash);
}
