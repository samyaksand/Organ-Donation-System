import { z } from 'zod';

export const myActivityQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();
export type MyActivityQuery = z.infer<typeof myActivityQuery>;
