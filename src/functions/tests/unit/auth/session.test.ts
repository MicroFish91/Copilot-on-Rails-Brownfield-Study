import { beforeEach, describe, expect, it } from 'vitest';
import {
  generateSessionToken,
  hashSessionToken,
  issueSession,
  revokeSession,
  validateSessionToken,
} from '../../../src/auth/session';
import { useMemoryServices } from '../../helpers/test-services';

describe('session tokens', () => {
  beforeEach(() => {
    useMemoryServices();
  });

  it('generates URL-safe tokens', () => {
    const t = generateSessionToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(32);
  });

  it('hashes tokens deterministically', () => {
    expect(hashSessionToken('abc')).toBe(hashSessionToken('abc'));
    expect(hashSessionToken('abc')).not.toBe(hashSessionToken('xyz'));
  });

  it('issues + validates a session', async () => {
    const { services } = useMemoryServices();
    const user = await services.database.create('user', {
      email: 'a@x',
      displayName: 'A',
      avatarUrl: null,
      coupleId: null,
      passwordHash: 'h',
    } as never);
    const issued = await issueSession(services, user.id);
    const session = await validateSessionToken(services, issued.token);
    expect(session?.userId).toBe(user.id);
  });

  it('rejects an invalid token', async () => {
    const { services } = useMemoryServices();
    expect(await validateSessionToken(services, 'nope')).toBeNull();
  });

  it('rejects an expired session', async () => {
    const { services } = useMemoryServices();
    const user = await services.database.create('user', {
      email: 'a@x',
      displayName: 'A',
      avatarUrl: null,
      coupleId: null,
      passwordHash: 'h',
    } as never);
    const issued = await issueSession(services, user.id);
    await services.database.update('session', issued.session.id, {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await validateSessionToken(services, issued.token)).toBeNull();
  });

  it('revokes a session', async () => {
    const { services } = useMemoryServices();
    const user = await services.database.create('user', {
      email: 'a@x',
      displayName: 'A',
      avatarUrl: null,
      coupleId: null,
      passwordHash: 'h',
    } as never);
    const issued = await issueSession(services, user.id);
    await revokeSession(services, issued.session.id);
    expect(await validateSessionToken(services, issued.token)).toBeNull();
  });
});
