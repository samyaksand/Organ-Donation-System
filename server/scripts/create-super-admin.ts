/**
 * Create (or re-password) the private Super Admin account.
 *
 *   npm run super-admin:create -- --email you@example.com --name "Your Name"
 *
 * Deliberately a separate script from create-admin.ts: there is no flag or API path that turns
 * a regular ADMIN into a SUPER_ADMIN, and no public sign-up ever creates one. This script must
 * be run directly against the database by whoever controls deployment secrets; it is never
 * reachable from the HTTP API.
 *
 * The password is read from SUPER_ADMIN_PASSWORD or prompted for interactively. Nothing here is
 * written to a file, logged, or sent anywhere other than the database itself.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
import { prisma } from '../src/lib/prisma';
import { emailSchema, passwordSchema } from '../src/schemas/common';
import { hashPassword } from '../src/utils/password';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const email = emailSchema.parse(arg('email') ?? process.env.SUPER_ADMIN_EMAIL ?? (await rl.question('Super Admin email: ')));
    const displayName = z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120)
      .parse(arg('name') ?? process.env.SUPER_ADMIN_NAME ?? (await rl.question('Display name: ')));
    const password = passwordSchema.parse(
      process.env.SUPER_ADMIN_PASSWORD ?? (await rl.question('Password (min 8 chars, letters + numbers): ')),
    );

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing && existing.role !== 'SUPER_ADMIN') {
      throw new Error(`${email} belongs to a ${existing.role} account; refusing to change its role.`);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, role: 'SUPER_ADMIN', admin: { create: { displayName } } },
      update: { passwordHash, admin: { upsert: { create: { displayName }, update: { displayName } } } },
      select: { id: true, email: true },
    });
    console.log(`${existing ? 'Updated' : 'Created'} Super Admin ${user.email}`);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  if (err instanceof z.ZodError) {
    console.error(err.issues.map((i) => `- ${i.message}`).join('\n'));
  } else {
    console.error(err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
