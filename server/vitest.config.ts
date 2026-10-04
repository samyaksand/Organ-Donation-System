import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Tests never touch a real database: Prisma is mocked (see tests/helpers/prisma-mock.ts).
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-secret-that-is-definitely-longer-than-32-chars',
      JWT_EXPIRES_IN: '1h',
      AUTH_RATE_LIMIT_MAX: '1000',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});
