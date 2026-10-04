import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock');
  const prisma = createPrismaMock();
  prisma.user.findUnique.mockResolvedValue(null);
  return { prisma };
});

describe('auth rate limiting', () => {
  it('returns 429 after too many failed login attempts', async () => {
    // Configure a tiny limit before the app (and its limiter) is loaded.
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    const { createApp } = await import('../src/app');
    const app = createApp();

    const attempt = () => request(app).post('/api/v1/auth/login').send({ email: 'x@example.com', password: 'nope-nope1' });
    for (let i = 0; i < 3; i += 1) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
