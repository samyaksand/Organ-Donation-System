import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Single .env at the repo root. src/config and dist/config are both three levels below it.
loadEnv({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 15m, 8h or 7d')
    .default('8h'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: booleanString,
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Fail fast: never boot with missing/weak secrets.
  throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
}

const raw = parsed.data;

function durationToMs(value: string): number {
  const amount = Number.parseInt(value, 10);
  const unit = value.slice(-1);
  const factor = unit === 's' ? 1_000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return amount * factor;
}

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  cookieSecure: raw.NODE_ENV === 'production' ? true : raw.COOKIE_SECURE,
  jwtExpiresInMs: durationToMs(raw.JWT_EXPIRES_IN),
  clientOrigins: raw.CLIENT_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
