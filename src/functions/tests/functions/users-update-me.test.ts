import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthSessionResponse, UpdateUserResponse } from '@duo-scrapbook/shared';
import { authRegisterHandler } from '../../src/functions/auth-register';
import { usersUpdateMeHandler } from '../../src/functions/users-update-me';
import { invoke } from '../helpers/invoke-handler';
import { useMemoryServices } from '../helpers/test-services';

async function register() {
  const r = await invoke(authRegisterHandler, {
    method: 'POST',
    path: '/api/auth/register',
    body: { email: 'a@x.test', password: 'hunter22!', displayName: 'A' },
  });
  return (r.jsonBody as AuthSessionResponse).sessionToken;
}

describe('PATCH /api/users/me', () => {
  beforeEach(() => useMemoryServices());

  it('updates display name', async () => {
    const token = await register();
    const r = await invoke(usersUpdateMeHandler, {
      method: 'PATCH',
      path: '/api/users/me',
      headers: { 'x-session-token': token },
      body: { displayName: 'New Name' },
    });
    expect(r.status).toBe(200);
    expect((r.jsonBody as UpdateUserResponse).user.displayName).toBe('New Name');
  });

  it('returns 401 without session', async () => {
    const r = await invoke(usersUpdateMeHandler, {
      method: 'PATCH',
      path: '/api/users/me',
      body: { displayName: 'X' },
    });
    expect(r.status).toBe(401);
  });

  it('returns 422 with empty body', async () => {
    const token = await register();
    const r = await invoke(usersUpdateMeHandler, {
      method: 'PATCH',
      path: '/api/users/me',
      headers: { 'x-session-token': token },
      body: {},
    });
    expect(r.status).toBe(422);
  });
});
