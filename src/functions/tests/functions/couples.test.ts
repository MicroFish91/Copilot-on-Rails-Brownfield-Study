import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AuthSessionResponse,
  CoupleWithMembersResponse,
  CreateCoupleResponse,
  JoinCoupleResponse,
} from '@duo-scrapbook/shared';
import { authRegisterHandler } from '../../src/functions/auth-register';
import { couplesCreateHandler } from '../../src/functions/couples-create';
import { couplesJoinHandler } from '../../src/functions/couples-join';
import { couplesLeaveHandler } from '../../src/functions/couples-leave';
import { couplesMeHandler } from '../../src/functions/couples-me';
import { invoke } from '../helpers/invoke-handler';
import { useMemoryServices } from '../helpers/test-services';

async function registerAs(email: string) {
  const r = await invoke(authRegisterHandler, {
    method: 'POST',
    path: '/api/auth/register',
    body: { email, password: 'hunter22!', displayName: email.split('@')[0] },
  });
  return (r.jsonBody as AuthSessionResponse).sessionToken;
}

describe('couples handlers', () => {
  beforeEach(() => useMemoryServices());

  it('create couple generates an invite code', async () => {
    const token = await registerAs('a@x.test');
    const r = await invoke(couplesCreateHandler, {
      method: 'POST',
      path: '/api/couples',
      headers: { 'x-session-token': token },
      body: { name: 'Us' },
    });
    expect(r.status).toBe(201);
    const body = r.jsonBody as CreateCoupleResponse;
    expect(body.couple.name).toBe('Us');
    expect(body.invite.code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('create couple returns 409 if user already in a couple', async () => {
    const token = await registerAs('a@x.test');
    await invoke(couplesCreateHandler, {
      method: 'POST',
      path: '/api/couples',
      headers: { 'x-session-token': token },
      body: { name: 'Us' },
    });
    const r = await invoke(couplesCreateHandler, {
      method: 'POST',
      path: '/api/couples',
      headers: { 'x-session-token': token },
      body: { name: 'Again' },
    });
    expect(r.status).toBe(409);
  });

  it('join couple by code', async () => {
    const tokenA = await registerAs('a@x.test');
    const create = await invoke(couplesCreateHandler, {
      method: 'POST',
      path: '/api/couples',
      headers: { 'x-session-token': tokenA },
      body: { name: 'Us' },
    });
    const code = (create.jsonBody as CreateCoupleResponse).invite.code;

    const tokenB = await registerAs('b@x.test');
    const r = await invoke(couplesJoinHandler, {
      method: 'POST',
      path: '/api/couples/join',
      headers: { 'x-session-token': tokenB },
      body: { code },
    });
    expect(r.status).toBe(200);
    expect((r.jsonBody as JoinCoupleResponse).couple.name).toBe('Us');
  });

  it('cannot join when already in a couple', async () => {
    const tokenA = await registerAs('a@x.test');
    await invoke(couplesCreateHandler, {
      method: 'POST',
      path: '/api/couples',
      headers: { 'x-session-token': tokenA },
      body: { name: 'Us' },
    });
    const r = await invoke(couplesJoinHandler, {
      method: 'POST',
      path: '/api/couples/join',
      headers: { 'x-session-token': tokenA },
      body: { code: 'AAAAAAAA' },
    });
    expect(r.status).toBe(409);
  });

  it('join with unknown code returns 404', async () => {
    const token = await registerAs('a@x.test');
    const r = await invoke(couplesJoinHandler, {
      method: 'POST',
      path: '/api/couples/join',
      headers: { 'x-session-token': token },
      body: { code: 'NOPE2345' },
    });
    expect(r.status).toBe(404);
  });

  it('me returns couple + members; leave clears it', async () => {
    const tokenA = await registerAs('a@x.test');
    const create = await invoke(couplesCreateHandler, {
      method: 'POST',
      path: '/api/couples',
      headers: { 'x-session-token': tokenA },
      body: { name: 'Us' },
    });
    const code = (create.jsonBody as CreateCoupleResponse).invite.code;
    const tokenB = await registerAs('b@x.test');
    await invoke(couplesJoinHandler, {
      method: 'POST',
      path: '/api/couples/join',
      headers: { 'x-session-token': tokenB },
      body: { code },
    });

    const me = await invoke(couplesMeHandler, {
      method: 'GET',
      path: '/api/couples/me',
      headers: { 'x-session-token': tokenA },
    });
    expect(me.status).toBe(200);
    const body = me.jsonBody as CoupleWithMembersResponse;
    expect(body.members.length).toBe(2);

    const leave = await invoke(couplesLeaveHandler, {
      method: 'DELETE',
      path: '/api/couples/me/leave',
      headers: { 'x-session-token': tokenA },
    });
    expect(leave.status).toBe(204);
  });

  it('me returns 403 when no couple', async () => {
    const token = await registerAs('a@x.test');
    const r = await invoke(couplesMeHandler, {
      method: 'GET',
      path: '/api/couples/me',
      headers: { 'x-session-token': token },
    });
    expect(r.status).toBe(403);
  });
});
