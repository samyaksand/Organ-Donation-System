/**
 * Create (or re-password) an administrator account.
 *
 *   npm run admin:create -- --email admin@hospital.org --name "Jane Doe"
 *
 * The password is read from ADMIN_PASSWORD or prompted for. It is stored as a bcrypt hash —
 * the legacy system kept admin passwords in plaintext; there is no public admin signup.
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
    const email = emailSchema.parse(arg('email') ?? process.env.ADMIN_EMAIL ?? (await rl.question('Admin email: ')));
    const displayName = z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120)
      .parse(arg('name') ?? process.env.ADMIN_NAME ?? (await rl.question('Display name: ')));
    const password = passwordSchema.parse(
      process.env.ADMIN_PASSWORD ?? (await rl.question('Password (min 8 chars, letters + numbers): ')),
    );

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing && existing.role !== 'ADMIN') {
      throw new Error(`${email} belongs to a non-admin account; refusing to change it.`);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, role: 'ADMIN', admin: { create: { displayName } } },
      update: { passwordHash, admin: { upsert: { create: { displayName }, update: { displayName } } } },
      select: { id: true, email: true },
    });
    console.log(`${existing ? 'Updated' : 'Created'} admin ${user.email}`);
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
