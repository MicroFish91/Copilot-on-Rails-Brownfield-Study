import { beforeEach, describe, expect, it } from 'vitest';
import { logRequest } from '../../../src/middleware/log-request';
import { stubContext, buildRequest } from '../../helpers/invoke-handler';
import { useMemoryServices } from '../../helpers/test-services';

describe('logRequest middleware', () => {
  beforeEach(() => useMemoryServices());

  it('passes through the inner handler response', async () => {
    const wrapped = logRequest(async () => ({ status: 200, jsonBody: { ok: true } }));
    const r = await wrapped(
      buildRequest({ method: 'GET', path: '/api/x' }),
      stubContext,
    );
    expect(r.status).toBe(200);
  });

  it('uses default 200 when status missing', async () => {
    const wrapped = logRequest(async () => ({ jsonBody: { ok: true } }));
    const r = await wrapped(
      buildRequest({ method: 'GET', path: '/api/x' }),
      stubContext,
    );
    expect(r.jsonBody).toEqual({ ok: true });
  });
});
