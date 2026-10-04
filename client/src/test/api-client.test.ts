import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '@/api/client';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('unwraps the { data } envelope and sends cookies', async () => {
    const fetchMock = mockFetch(200, { data: { ok: true } });
    await expect(api.get('/health')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', expect.objectContaining({ credentials: 'include', method: 'GET' }));
  });

  it('drops empty query params', async () => {
    const fetchMock = mockFetch(200, { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } });
    await api.getPage('/organs/availability', { organType: 'KIDNEY', city: '', page: 2, hospitalId: undefined });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/organs/availability?organType=KIDNEY&page=2');
  });

  it('throws ApiError carrying the server code, message and field errors', async () => {
    mockFetch(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid', details: { fields: [{ path: 'email', message: 'Bad email' }] } },
    });
    const error = await api.post('/auth/login', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fields: [{ path: 'email', message: 'Bad email' }] });
  });

  it('maps network failures to a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.get('/health')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('handles 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(api.delete('/organs/1')).resolves.toBeUndefined();
  });
});
