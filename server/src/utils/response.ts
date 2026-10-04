import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Success envelope: `{ data, meta? }`. Errors use `{ error }` (see middleware/errorHandler). */
export function sendData<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json(meta ? { data, meta } : { data });
}

export function sendPage<T>(res: Response, data: T[], meta: PaginationMeta) {
  return res.status(200).json({ data, meta });
}

export function buildPageMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function pageArgs(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
