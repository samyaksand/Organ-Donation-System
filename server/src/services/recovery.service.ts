/**
 * Demo-database recovery (System Recovery, SUPER_ADMIN only).
 *
 * The known-good snapshot is a `pg_dump` custom-format archive stored on disk, outside
 * PostgreSQL itself (see `env.demoBackupDir`), created ahead of time by `npm run demo:snapshot`
 * (normally: load the seed data, then dump it). Restoring replays that archive with
 * `pg_restore --clean --if-exists`, which drops and recreates the schema's objects before
 * reloading them, so the result is the known-good state rather than a merge with whatever is
 * currently in the database.
 *
 * This module never returns the database connection string, the backup file's path, raw
 * command output, or anything else that could help someone reach the database directly; see
 * utils/pgTools.ts for the command execution itself.
 */
import { existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';
import { dumpDatabase, restoreDatabase } from '../utils/pgTools';

const SNAPSHOT_FILENAME = 'demo-known-good.dump';

function snapshotPath(): string {
  return path.join(env.demoBackupDir, SNAPSHOT_FILENAME);
}

function requireEnabled(): void {
  if (!env.DEMO_RECOVERY_ENABLED) {
    throw AppError.forbidden('Demo recovery is not enabled on this deployment.');
  }
}

const DISABLED_STATUS = {
  enabled: false as const,
  snapshot: { available: false as const, createdAt: null },
  currentState: null,
  lastRecovery: null,
};

/**
 * Status shown on the System Recovery page. No credentials, paths, or raw data included.
 *
 * When DEMO_RECOVERY_ENABLED is false, this returns a fixed, minimal payload without touching
 * the filesystem, the backup directory, or running any extra queries: recovery is meant to be
 * completely inert on a deployment that hasn't opted in, not merely "the restore button is
 * disabled."
 */
export async function getRecoveryStatus() {
  if (!env.DEMO_RECOVERY_ENABLED) return DISABLED_STATUS;

  const file = snapshotPath();
  const exists = existsSync(file);
  const snapshot = exists
    ? { available: true as const, createdAt: statSync(file).mtime }
    : { available: false as const, createdAt: null };

  const [donorCount, organCount, hospitalCount, lastRun] = await Promise.all([
    prisma.donor.count(),
    prisma.organ.count(),
    prisma.hospital.count(),
    prisma.recoveryLog.findFirst({ orderBy: { startedAt: 'desc' } }),
  ]);

  return {
    enabled: true as const,
    snapshot,
    currentState: { donorCount, organCount, hospitalCount },
    lastRecovery: lastRun
      ? {
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          finishedAt: lastRun.finishedAt,
          initiatorEmail: lastRun.initiatorEmail,
          message: lastRun.message,
        }
      : null,
  };
}

/** Creates/refreshes the known-good snapshot from the database's current contents. */
export async function createSnapshot(): Promise<{ ok: boolean; message: string }> {
  requireEnabled();
  await mkdir(env.demoBackupDir, { recursive: true });
  return dumpDatabase(env.DATABASE_URL, snapshotPath());
}

/**
 * Restores the database from the known-good snapshot, then writes a single audit log entry for
 * the attempt. The entry is written AFTER `pg_restore` runs, never before: `pg_restore --clean`
 * drops and recreates every table in the dump, `recovery_logs` included, so a row created before
 * the restore would itself be wiped out by it (confirmed against a real database while building
 * this). Writing a fresh row afterwards, outside the restored transaction entirely, survives
 * both a successful restore (which recreates an empty recovery_logs table) and a failed one
 * (which may have left the schema partially restored).
 */
export async function restoreFromSnapshot(actor: { userId: string; email: string }): Promise<{ ok: boolean; message: string }> {
  requireEnabled();

  const file = snapshotPath();
  if (!existsSync(file)) {
    throw AppError.conflict('No known-good snapshot exists yet. Run `npm run demo:snapshot` first.');
  }

  const startedAt = new Date();
  const result = await restoreDatabase(env.DATABASE_URL, file);
  const finishedAt = new Date();

  try {
    await prisma.recoveryLog.create({
      data: {
        initiatedBy: actor.userId,
        initiatorEmail: actor.email,
        status: result.ok ? 'SUCCEEDED' : 'FAILED',
        message: result.message,
        startedAt,
        finishedAt,
      },
    });
  } catch {
    // The restore itself already succeeded or failed; losing the audit row on top of that is a
    // secondary problem and must not mask the real result from the caller.
  }

  return result;
}
