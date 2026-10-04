/**
 * Creates/refreshes the known-good demo snapshot used by System Recovery.
 *
 *   npm run demo:snapshot
 *
 * This does NOT reseed the database itself (run `npm run db:seed` first if you want the
 * snapshot to capture a freshly-reset demo state). It only dumps whatever is currently in the
 * database to `DEMO_BACKUP_DIR`, as a `pg_dump` custom-format archive, so System Recovery has
 * something to restore to. Refuses to run when DEMO_RECOVERY_ENABLED is not set, matching the
 * API's own guard, so a snapshot is never silently created on a deployment that didn't opt in.
 */
import { env } from '../src/config/env';
import { createSnapshot } from '../src/services/recovery.service';

async function main() {
  if (!env.DEMO_RECOVERY_ENABLED) {
    console.error('DEMO_RECOVERY_ENABLED is not set to true. Refusing to create a demo snapshot.');
    process.exit(1);
  }

  console.log('Creating demo snapshot...');
  const result = await createSnapshot();
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(result.message);
  console.log(`Saved to: ${env.demoBackupDir}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
