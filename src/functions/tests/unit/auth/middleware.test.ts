import { beforeEach, describe, expect, it } from 'vitest';
import type { Photo, User } from '@duo-scrapbook/shared';
import {
  requireCouple,
  requireSameCouple,
  requireUser,
} from '../../../src/auth/middleware';
import { issueSession } from '../../../src/auth/session';
import { ForbiddenError, UnauthorizedError } from '../../../src/errors/errors';
import { buildRequest } from '../../helpers/invoke-handler';
import { useMemoryServices } from '../../helpers/test-services';

describe('auth middleware', () => {
  beforeEach(() => useMemoryServices());

  it('requireUser throws without header', async () => {
    const { services } = useMemoryServices();
    const req = buildRequest({ method: 'GET', path: '/api/test' });
    await expect(requireUser(req, services)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('requireUser throws on invalid token', async () => {
    const { services } = useMemoryServices();
    const req = buildRequest({
      method: 'GET',
      path: '/api/test',
      headers: { 'x-session-token': 'nope' },
    });
    await expect(requireUser(req, services)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('requireUser returns the user with valid token', async () => {
    const { services } = useMemoryServices();
    const user = await services.database.create('user', {
      email: 'a@x',
      displayName: 'A',
      avatarUrl: null,
      coupleId: null,
      passwordHash: 'h',
    } as never);
    const issued = await issueSession(services, user.id);
    const req = buildRequest({
      method: 'GET',
      path: '/api/test',
      headers: { 'X-Session-Token': issued.token },
    });
    const ctx = await requireUser(req, services);
    expect(ctx.user.id).toBe(user.id);
  });

  it('requireCouple returns coupleId or throws', () => {
    const u: User = {
      id: '1',
      email: 'a@x',
      displayName: 'A',
      avatarUrl: null,
      coupleId: 'c1',
      createdAt: '',
      updatedAt: '',
    };
    expect(requireCouple(u)).toBe('c1');
    expect(() => requireCouple({ ...u, coupleId: null })).toThrow(ForbiddenError);
  });

  it('requireSameCouple enforces couple match', () => {
    const u: User = {
      id: '1',
      email: 'a@x',
      displayName: 'A',
      avatarUrl: null,
      coupleId: 'c1',
      createdAt: '',
      updatedAt: '',
    };
    const p: Photo = {
      id: 'p1',
      coupleId: 'c1',
      uploadedByUserId: '1',
      blobName: 'b',
      blobUrl: 'u',
      mimeType: 'image/jpeg',
      sizeBytes: 1,
      caption: '',
      captionStatus: 'ready',
      takenAt: null,
      createdAt: '',
      updatedAt: '',
    };
    expect(() => requireSameCouple(u, p)).not.toThrow();
    expect(() => requireSameCouple(u, { ...p, coupleId: 'other' })).toThrow(
      ForbiddenError,
    );
  });
});
