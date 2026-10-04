import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma skips automatic .env loading when a config file is present.
// The project keeps a single .env at the repository root (npm scripts run from /server).
loadEnv({ path: '../.env', quiet: true });

export default defineConfig({
  schema: '../prisma/schema.prisma',
  migrations: {
    path: '../prisma/migrations',
    seed: 'tsx ../prisma/seed.ts',
  },
});
