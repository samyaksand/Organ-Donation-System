import { randomInt } from 'node:crypto';

// Unambiguous alphabet (no 0/O, 1/I/L).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Human-facing Donor ID, keeping the legacy `DN` prefix (e.g. DN4K7Q2M). */
export function generateDonorCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `DN${suffix}`;
}
