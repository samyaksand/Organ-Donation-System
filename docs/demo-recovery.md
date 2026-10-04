# Demo database recovery

This documents the System Recovery feature (Super Admin only) and the manual fallback procedure
for restoring the public demo database if the application itself is unavailable.

It assumes the deployment is deliberately running **public demo data**, never real donor or
hospital records. `DEMO_RECOVERY_ENABLED` must be explicitly set to `true` for any of this to be
active; it is `false` by default.

## How it works

- The known-good state is a `pg_dump` **custom-format archive** stored on disk at
  `DEMO_BACKUP_DIR` (default `./backups`), **outside PostgreSQL itself**. It is created ahead of
  time, not on demand, by running `npm run demo:snapshot`.
- Restoring runs `pg_restore --clean --if-exists` against that archive, which drops and recreates
  the schema's own objects before reloading them, so the result is exactly the known-good state
  rather than a merge with whatever is currently in the database.
- Only the Super Admin role can trigger a restore (`SUPER_ADMIN`, not `ADMIN`); see
  `server/src/routes/recovery.routes.ts`. Every attempt is written to the `recovery_logs` table
  (who, when, success or failure, a short fixed message) **after** the restore runs, since the
  restore itself would otherwise wipe out a row written beforehand.
- The application never receives, logs, or returns the database connection string, the backup
  file's path, or raw `pg_dump`/`pg_restore` output; see `server/src/utils/pgTools.ts`.

## Creating / refreshing the known-good snapshot

```bash
# From the repository root, with DEMO_RECOVERY_ENABLED=true in .env
npm run db:seed          # optional: reset to a clean, fully-synthetic demo state first
npm run demo:snapshot    # dumps the current database to DEMO_BACKUP_DIR
```

Re-run `demo:snapshot` any time you want to move the recovery point forward (for example, after a
schema migration: migrate, reseed, then snapshot again). The previous snapshot file is simply
overwritten.

### If `pg_dump` / `pg_restore` are not on PATH

Set `PG_DUMP_BIN` and `PG_RESTORE_BIN` to the full path of each binary. This is common on Windows,
where a PostgreSQL install does not always add its `bin/` directory to PATH:

```bash
PG_DUMP_BIN="/c/Program Files/PostgreSQL/18/bin/pg_dump.exe"
PG_RESTORE_BIN="/c/Program Files/PostgreSQL/18/bin/pg_restore.exe"
```

## Restoring from the Super Admin interface

1. Sign in through the admin login page with the private Super Admin account (this is the same
   login form everyone uses; there is no separate, discoverable "Super Admin" option).
2. Open **System recovery** in the sidebar (only visible to a `SUPER_ADMIN` session).
3. Review the current demo counts and the snapshot's creation date.
4. Click **Restore Demo Database**, read the confirmation dialog, and confirm.
5. The result (succeeded or failed) is shown immediately, and recorded as the "last recovery
   attempt" on the same page for anyone who opens it afterwards.

## Manual recovery (application unavailable)

If the application itself cannot be reached, the same restore can be run directly against
PostgreSQL from a machine that has network access to the database and the snapshot file:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "<DATABASE_URL>" path/to/demo-known-good.dump
```

Notes:

- `<DATABASE_URL>` is the real connection string from the deployment's own secret store. It is
  never written down in this repository, in the README, or anywhere else version-controlled;
  retrieve it from wherever the deployment's secrets actually live (for example, your hosting
  provider's environment-variable dashboard or secrets manager).
- Prisma's `DATABASE_URL` often carries a `?schema=...` query parameter that `pg_restore` does not
  understand; drop it (and use `--schema <name>` instead, if the schema isn't `public`).
- `pg_dump`/`pg_restore` must be a version compatible with the target PostgreSQL server. Using the
  server's own major-version client tools is the safest default.

## Hardening recommendations for a real deployment

The application currently runs `pg_dump`/`pg_restore` using the same `DATABASE_URL` the app
already has for everything else. For a deployment that takes this further:

- Create a **dedicated PostgreSQL role** for backup/restore with the minimum privileges actually
  required (`pg_dump`/`pg_restore` do not need superuser), and point `DATABASE_URL` used by the
  recovery feature specifically at that role rather than the main application role.
- If the hosting provider offers **managed snapshots/restores** (for example, a managed Postgres
  service with its own backup API), prefer that over `pg_dump`/`pg_restore` entirely: swap the
  implementation inside `server/src/utils/pgTools.ts` and `server/src/services/recovery.service.ts`
  for a call to that provider's API, using a scoped service credential that is never exposed to
  the browser. The HTTP-facing parts of this feature (routes, controller, audit log, UI) do not
  need to change.
- Store the known-good snapshot somewhere durable and separate from the application server itself
  (object storage, a dedicated backup volume), not just the application's local disk.
