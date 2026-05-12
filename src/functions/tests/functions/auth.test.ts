import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthSessionResponse, MeResponse } from '@duo-scrapbook/shared';
import { authLoginHandler } from '../../src/functions/auth-login';
import { authLogoutHandler } from '../../src/functions/auth-logout';
import { authMeHandler } from '../../src/functions/auth-me';
import { authRegisterHandler } from '../../src/functions/auth-register';
import { invoke } from '../helpers/invoke-handler';
import { useMemoryServices } from '../helpers/test-services';

const sample = {
  email: 'alex@example.com',
  password: 'hunter22!',
  displayName: 'Alex',
};

async function register() {
  const r = await invoke(authRegisterHandler, {
    method: 'POST',
    path: '/api/auth/register',
    body: sample,
  });
  return { status: r.status, body: r.jsonBody as AuthSessionResponse };
}

describe('auth handlers', () => {
  beforeEach(() => useMemoryServices());

  it('register creates user + session', async () => {
    const { status, body } = await register();
    expect(status).toBe(201);
    expect(body.user.email).toBe(sample.email);
    expect(body.sessionToken).toMatch(/^[A-Za-z0-9_-]+$/);
    expect((body.user as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  it('register returns 409 on duplicate email', async () => {
    await register();
    const r2 = await invoke(authRegisterHandler, {
      method: 'POST',
      path: '/api/auth/register',
      body: sample,
    });
    expect(r2.status).toBe(409);
  });

  it('register returns 422 on validation failure', async () => {
    const r = await invoke(authRegisterHandler, {
      method: 'POST',
      path: '/api/auth/register',
      body: { email: 'no', password: 'x', displayName: '' },
    });
    expect(r.status).toBe(422);
  });

  it('login succeeds with correct credentials', async () => {
    await register();
    const r = await invoke(authLoginHandler, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: sample.email, password: sample.password },
    });
    expect(r.status).toBe(200);
    const body = r.jsonBody as AuthSessionResponse;
    expect(body.user.email).toBe(sample.email);
  });

  it('login returns 401 with bad password', async () => {
    await register();
    const r = await invoke(authLoginHandler, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: sample.email, password: 'wrong-password' },
    });
    expect(r.status).toBe(401);
  });

  it('login returns 401 for unknown email', async () => {
    const r = await invoke(authLoginHandler, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nope@example.com', password: 'hunter22!' },
    });
    expect(r.status).toBe(401);
  });

  it('me returns user + null couple', async () => {
    const { body } = await register();
    const r = await invoke(authMeHandler, {
      method: 'GET',
      path: '/api/auth/me',
      headers: { 'x-session-token': body.sessionToken },
    });
    expect(r.status).toBe(200);
    const me = r.jsonBody as MeResponse;
    expect(me.user.email).toBe(sample.email);
    expect(me.couple).toBeNull();
  });

  it('me returns 401 without session', async () => {
    const r = await invoke(authMeHandler, { method: 'GET', path: '/api/auth/me' });
    expect(r.status).toBe(401);
  });

  it('logout returns 204 and invalidates session', async () => {
    const { body } = await register();
    const r = await invoke(authLogoutHandler, {
      method: 'POST',
      path: '/api/auth/logout',
      headers: { 'x-session-token': body.sessionToken },
    });
    expect(r.status).toBe(204);
    const r2 = await invoke(authMeHandler, {
      method: 'GET',
      path: '/api/auth/me',
      headers: { 'x-session-token': body.sessionToken },
    });
    expect(r2.status).toBe(401);
  });
});
