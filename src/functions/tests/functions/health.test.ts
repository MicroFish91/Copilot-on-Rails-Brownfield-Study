import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HealthResponse } from '@duo-scrapbook/shared';
import { healthHandler } from '../../src/functions/health';
import { invoke } from '../helpers/invoke-handler';
import { useMemoryServices } from '../helpers/test-services';

describe('GET /api/health', () => {
  beforeEach(() => useMemoryServices());

  it('returns 200 healthy when all services are up', async () => {
    const r = await invoke(healthHandler, { method: 'GET', path: '/api/health' });
    expect(r.status).toBe(200);
    const body = r.jsonBody as HealthResponse;
    expect(body.status).toBe('healthy');
  });

  it('returns 200 degraded when only caption is down', async () => {
    const handle = useMemoryServices();
    vi.spyOn(handle.caption, 'ping').mockResolvedValue(false);
    const r = await invoke(healthHandler, { method: 'GET', path: '/api/health' });
    expect(r.status).toBe(200);
    const body = r.jsonBody as HealthResponse;
    expect(body.status).toBe('degraded');
    expect(body.services.caption?.status).toBe('unhealthy');
  });

  it('returns 503 unhealthy when database is down', async () => {
    const handle = useMemoryServices();
    vi.spyOn(handle.database, 'ping').mockResolvedValue(false);
    const r = await invoke(healthHandler, { method: 'GET', path: '/api/health' });
    expect(r.status).toBe(503);
    const body = r.jsonBody as HealthResponse;
    expect(body.status).toBe('unhealthy');
  });

  it('returns 503 unhealthy when blob storage throws', async () => {
    const handle = useMemoryServices();
    vi.spyOn(handle.blobStorage, 'ping').mockRejectedValue(new Error('down'));
    const r = await invoke(healthHandler, { method: 'GET', path: '/api/health' });
    expect(r.status).toBe(503);
  });
});
