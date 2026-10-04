/**
 * Thin wrapper around the `pg_dump` / `pg_restore` CLI tools, used only by the demo-recovery
 * feature (see services/recovery.service.ts). Deliberately NOT a generic shell-exec helper:
 *
 * - Uses `execFile`, never `exec`/a shell, so the connection string can never be interpreted
 *   as shell syntax.
 * - Never logs or returns the connection string, stdout, or stderr to a caller; only a short,
 *   fixed, operator-facing message and a boolean outcome ever leave this module.
 * - The binary path is configurable (`PG_DUMP_BIN` / `PG_RESTORE_BIN`) because `pg_dump` and
 *   `pg_restore` are not guaranteed to be on PATH (for example, a bare Windows Node install).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function resolveBin(envVar: string, fallback: string): string {
  return process.env[envVar]?.trim() || fallback;
}

const PG_DUMP_BIN = resolveBin('PG_DUMP_BIN', 'pg_dump');
const PG_RESTORE_BIN = resolveBin('PG_RESTORE_BIN', 'pg_restore');

export interface PgToolResult {
  ok: boolean;
  /** Short, fixed, non-sensitive summary. Never raw stdout/stderr (which can echo the URL). */
  message: string;
}

/**
 * Prisma's DATABASE_URL carries its own query parameters (`schema`, `connection_limit`, ...)
 * that libpq-based tools like pg_dump/pg_restore do not understand and will reject outright
 * ("invalid URI query parameter"). This strips them, returning a plain libpq connection string
 * plus the target schema name (defaulting to "public", Postgres's own default) so the caller can
 * pass it as a real `--schema` flag instead.
 */
function toLibpqUrl(databaseUrl: string): { url: string; schema: string } {
  const parsed = new URL(databaseUrl);
  const schema = parsed.searchParams.get('schema') || 'public';
  parsed.search = '';
  return { url: parsed.toString(), schema };
}

/** Runs `pg_dump` against `databaseUrl`, writing a custom-format archive to `outFile`. */
export async function dumpDatabase(databaseUrl: string, outFile: string): Promise<PgToolResult> {
  try {
    const { url, schema } = toLibpqUrl(databaseUrl);
    await execFileAsync(
      PG_DUMP_BIN,
      ['--format=custom', '--no-owner', '--no-privileges', '--schema', schema, '--file', outFile, url],
      { timeout: 5 * 60_000 },
    );
    return { ok: true, message: 'Snapshot created' };
  } catch {
    // Deliberately no `err.message`/stderr here: pg_dump echoes the failing connection string
    // (including the password) into its own error output.
    return { ok: false, message: 'pg_dump failed. Check server logs on the database host, not the application logs.' };
  }
}

/**
 * Restores `inFile` into `databaseUrl` with `--clean --if-exists`, so the target schema is
 * dropped and recreated from the archive rather than merged with whatever is currently there.
 */
export async function restoreDatabase(databaseUrl: string, inFile: string): Promise<PgToolResult> {
  try {
    const { url } = toLibpqUrl(databaseUrl);
    await execFileAsync(
      PG_RESTORE_BIN,
      ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--dbname', url, inFile],
      { timeout: 10 * 60_000 },
    );
    return { ok: true, message: 'Database restored from the known-good snapshot' };
  } catch {
    return { ok: false, message: 'pg_restore failed. Check server logs on the database host, not the application logs.' };
  }
}
