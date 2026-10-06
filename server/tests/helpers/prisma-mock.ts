import { vi } from 'vitest';

/**
 * Minimal Prisma stand-in. Each model exposes the methods the services use as vi.fn()s;
 * `$transaction` supports both the array form and the interactive (callback) form.
 */
function model() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
  };
}

export function createPrismaMock() {
  const mock = {
    user: model(),
    donor: model(),
    admin: model(),
    nextOfKin: model(),
    hospital: model(),
    organ: model(),
    withdrawalRequest: model(),
    organRequest: model(),
    recoveryLog: model(),
    workflowEvent: model(),
    pledge: model(),
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  };
  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === 'function') return (arg as (tx: typeof mock) => unknown)(mock);
    throw new Error('Unsupported $transaction usage in test');
  });
  return mock;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;
