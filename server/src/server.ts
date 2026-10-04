import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

// Bind explicitly to 0.0.0.0: required by Render (and most container platforms) so the service
// is reachable from outside the container, not just from localhost inside it.
const HOST = '0.0.0.0';
const server = app.listen(env.PORT, HOST, () => {
  console.log(`[server] API listening on http://${HOST}:${env.PORT}/api/v1 (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force exit if connections do not drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
