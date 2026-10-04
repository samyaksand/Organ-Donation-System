import type { PageMeta, Paginated } from '@/types/api';

const BASE_URL = `${(import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`;

export interface FieldError {
  path: string;
  message: string;
}

/** Error thrown for every non-2xx response, carrying the server's `{ error }` envelope. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthenticated() {
    return this.status === 401;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query) {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(path: string, { method = 'GET', body, query, signal }: RequestOptions = {}) {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return { data: undefined as T, meta: undefined };

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; meta?: PageMeta; error?: { code: string; message: string; details?: { fields?: FieldError[] } } }
    | null;

  if (!response.ok) {
    const err = payload?.error;
    throw new ApiError(
      response.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? `Request failed (${response.status})`,
      err?.details?.fields ?? [],
    );
  }

  return { data: payload?.data as T, meta: payload?.meta };
}

export const api = {
  async get<T>(path: string, query?: Query, signal?: AbortSignal): Promise<T> {
    return (await request<T>(path, { query, signal })).data;
  },
  async getPage<T>(path: string, query?: Query, signal?: AbortSignal): Promise<Paginated<T>> {
    const { data, meta } = await request<T[]>(path, { query, signal });
    return { items: data ?? [], meta: meta ?? { page: 1, pageSize: data?.length ?? 0, total: data?.length ?? 0, totalPages: 1 } };
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    return (await request<T>(path, { method: 'POST', body: body ?? {} })).data;
  },
  async put<T>(path: string, body: unknown): Promise<T> {
    return (await request<T>(path, { method: 'PUT', body })).data;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    return (await request<T>(path, { method: 'PATCH', body })).data;
  },
  async delete(path: string): Promise<void> {
    await request<void>(path, { method: 'DELETE' });
  },
};

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
