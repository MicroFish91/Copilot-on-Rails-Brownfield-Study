import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError, apiClient, setStoredToken } from '../../src/api/client';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setStoredToken(null);
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('apiClient', () => {
  it('attaches the session token header when present', async () => {
    setStoredToken('abc123');
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: 'u' }, couple: null }),
    );
    await apiClient.me();
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ 'x-session-token': 'abc123' });
  });

  it('parses ApiErrorResponse and throws a typed ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'NOT_FOUND', message: 'Missing thing' } },
        { status: 404 },
      ),
    );
    await expect(apiClient.getPhoto('p1')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Missing thing',
    });
  });

  it('returns undefined for 204 responses', async () => {
    setStoredToken('t');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiClient.deletePhoto('p1')).resolves.toBeUndefined();
  });

  it('serializes JSON bodies and sets content-type', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: 'u' }, sessionToken: 't' }, { status: 201 }),
    );
    await apiClient.register({ email: 'a@b.com', password: 'longpass1', displayName: 'A' });
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ 'content-type': 'application/json' });
    expect((init as RequestInit).body).toContain('a@b.com');
  });

  it('uploadPhoto sends a multipart FormData body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ photo: { id: 'p1' } }, { status: 201 }),
    );
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await apiClient.uploadPhoto(file);
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
  });

  it('isUnauthorized() returns true for 401', () => {
    const err = new ApiError(401, 'UNAUTHORIZED', 'no');
    expect(err.isUnauthorized()).toBe(true);
  });
});
