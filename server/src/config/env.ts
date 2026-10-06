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
  // Share the auth cookie across subdomains when the API and the client live on different ones
  // (e.g. api.organflow.example.com and organflow.example.com both need ".organflow.example.com").
  // Leave unset for a single-origin deployment or local development.
  COOKIE_DOMAIN: z.string().optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  // Demo database recovery (System Recovery, Super Admin only). Off by default: a real
  // deployment must opt in deliberately, never by forgetting to unset something.
  DEMO_RECOVERY_ENABLED: booleanString,
  // Directory holding the known-good demo snapshot, created by `npm run demo:snapshot`.
  // Deliberately outside PostgreSQL itself (see docs/demo-recovery.md).
  DEMO_BACKUP_DIR: z.string().default('./backups'),
  // Operations Intelligence Agent (admin + public, read-only). All three are optional: a
  // deployment with none configured still runs normally, the agent endpoints just report a
  // clear "unavailable" error. When more than one is set, agent/providers.ts fails over between
  // them in the fixed order Gemini -> Groq -> OpenRouter.
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openrouter/free'),
  // Per-admin-user request budget for the admin agent endpoint (expensive LLM calls).
  AGENT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AGENT_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  // Per-IP budget for the public (unauthenticated) analytics endpoints. The public Analytics
  // page fires ~6 parallel queries per load (overview/organs/hospitals/concentration/trends/
  // breaches), so this must be generous enough for normal repeated browsing - not just a single
  // page view - while still bounding abuse. 240 per 15 min ~= 40 page loads per IP.
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(240),
  PUBLIC_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  PUBLIC_AGENT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  PUBLIC_AGENT_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
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
  demoBackupDir: path.resolve(__dirname, '../../../', raw.DEMO_BACKUP_DIR),
  hasGemini: Boolean(raw.GEMINI_API_KEY),
  hasGroq: Boolean(raw.GROQ_API_KEY),
  hasOpenRouter: Boolean(raw.OPENROUTER_API_KEY),
  openRouterModel: raw.OPENROUTER_MODEL,
  hasAnyAgentProvider: Boolean(raw.GEMINI_API_KEY || raw.GROQ_API_KEY || raw.OPENROUTER_API_KEY),
} as const;

export type Env = typeof env;
