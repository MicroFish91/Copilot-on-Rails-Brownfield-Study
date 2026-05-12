import { describe, expect, it } from 'vitest';
import { openapiHandler } from '../../src/functions/openapi';
import { invoke } from '../helpers/invoke-handler';
import { useMemoryServices } from '../helpers/test-services';

const REQUIRED_PATHS: Array<{ path: string; method: string }> = [
  { path: '/api/health', method: 'get' },
  { path: '/api/auth/register', method: 'post' },
  { path: '/api/auth/login', method: 'post' },
  { path: '/api/auth/logout', method: 'post' },
  { path: '/api/auth/me', method: 'get' },
  { path: '/api/users/me', method: 'patch' },
  { path: '/api/couples', method: 'post' },
  { path: '/api/couples/join', method: 'post' },
  { path: '/api/couples/me', method: 'get' },
  { path: '/api/couples/me/leave', method: 'delete' },
  { path: '/api/photos', method: 'post' },
  { path: '/api/photos', method: 'get' },
  { path: '/api/photos/{id}', method: 'get' },
  { path: '/api/photos/{id}', method: 'delete' },
  { path: '/api/photos/{id}/regenerate-caption', method: 'post' },
  { path: '/api/openapi.json', method: 'get' },
];

describe('openapi spec', () => {
  it('returns valid OpenAPI 3.1 doc with every Section 6 route', async () => {
    useMemoryServices();
    const r = await invoke(openapiHandler, { method: 'GET', path: '/api/openapi.json' });
    expect(r.status).toBe(200);
    const spec = r.jsonBody as {
      openapi: string;
      info: { title: string };
      components?: { securitySchemes?: Record<string, unknown> };
      paths: Record<string, Record<string, unknown>>;
    };
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toMatch(/Duo Scrapbook/i);
    expect(spec.components?.securitySchemes?.sessionToken).toBeDefined();

    for (const { path, method } of REQUIRED_PATHS) {
      const entry = spec.paths[path];
      expect(entry, `missing path ${path}`).toBeDefined();
      expect(entry?.[method], `missing ${method.toUpperCase()} ${path}`).toBeDefined();
    }
  });
});
