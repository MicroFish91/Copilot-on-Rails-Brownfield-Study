import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AuthSessionResponse,
  CreateCoupleResponse,
  PhotoListResponse,
  PhotoResponse,
} from '@duo-scrapbook/shared';
import { authRegisterHandler } from '../../src/functions/auth-register';
import { couplesCreateHandler } from '../../src/functions/couples-create';
import { couplesJoinHandler } from '../../src/functions/couples-join';
import { photosCreateHandler } from '../../src/functions/photos-create';
import { photosDeleteHandler } from '../../src/functions/photos-delete';
import { photosGetHandler } from '../../src/functions/photos-get';
import { photosListHandler } from '../../src/functions/photos-list';
import { photosRegenerateCaptionHandler } from '../../src/functions/photos-regenerate-caption';
import { buildMultipart, invoke } from '../helpers/invoke-handler';
import { useMemoryServices, type MemoryServicesHandle } from '../helpers/test-services';

async function registerAs(email: string) {
  const r = await invoke(authRegisterHandler, {
    method: 'POST',
    path: '/api/auth/register',
    body: { email, password: 'hunter22!', displayName: email.split('@')[0] },
  });
  return (r.jsonBody as AuthSessionResponse).sessionToken;
}

async function setupCouple(): Promise<{
  uploaderToken: string;
  partnerToken: string;
  strangerToken: string;
}> {
  const uploaderToken = await registerAs('uploader@x.test');
  const create = await invoke(couplesCreateHandler, {
    method: 'POST',
    path: '/api/couples',
    headers: { 'x-session-token': uploaderToken },
    body: { name: 'Us' },
  });
  const code = (create.jsonBody as CreateCoupleResponse).invite.code;
  const partnerToken = await registerAs('partner@x.test');
  await invoke(couplesJoinHandler, {
    method: 'POST',
    path: '/api/couples/join',
    headers: { 'x-session-token': partnerToken },
    body: { code },
  });
  const strangerTokenSetup = await registerAs('stranger@x.test');
  await invoke(couplesCreateHandler, {
    method: 'POST',
    path: '/api/couples',
    headers: { 'x-session-token': strangerTokenSetup },
    body: { name: 'Other' },
  });
  return { uploaderToken, partnerToken, strangerToken: strangerTokenSetup };
}

async function uploadPhoto(token: string, name = 'test.jpg') {
  const { bytes, contentType } = await buildMultipart([
    {
      name: 'file',
      value: new Uint8Array([1, 2, 3, 4, 5, 6]),
      filename: name,
      contentType: 'image/jpeg',
    },
  ]);
  return invoke(photosCreateHandler, {
    method: 'POST',
    path: '/api/photos',
    headers: { 'x-session-token': token, 'content-type': contentType },
    bodyBytes: bytes,
  });
}

describe('photos handlers', () => {
  let handle: MemoryServicesHandle;
  beforeEach(() => {
    handle = useMemoryServices();
  });

  it('uploads a photo with a caption (ready when caption from model)', async () => {
    const { uploaderToken } = await setupCouple();
    vi.spyOn(handle.caption, 'generate').mockResolvedValueOnce({
      caption: 'A model caption',
      fromModel: true,
    });
    const r = await uploadPhoto(uploaderToken);
    expect(r.status).toBe(201);
    const body = r.jsonBody as PhotoResponse;
    expect(body.photo.captionStatus).toBe('ready');
    expect(body.photo.caption).toBe('A model caption');
    expect(body.photo.sizeBytes).toBe(6);
  });

  it('marks captionStatus failed when caption service throws', async () => {
    const { uploaderToken } = await setupCouple();
    vi.spyOn(handle.caption, 'generate').mockRejectedValueOnce(new Error('down'));
    const r = await uploadPhoto(uploaderToken);
    expect(r.status).toBe(201);
    const body = r.jsonBody as PhotoResponse;
    expect(body.photo.captionStatus).toBe('failed');
    expect(body.photo.caption).toBe('A new memory.');
  });

  it('rejects unsupported mime type with 415', async () => {
    const { uploaderToken } = await setupCouple();
    const { bytes, contentType } = await buildMultipart([
      {
        name: 'file',
        value: new Uint8Array([1, 2, 3]),
        filename: 'x.svg',
        contentType: 'image/svg+xml',
      },
    ]);
    const r = await invoke(photosCreateHandler, {
      method: 'POST',
      path: '/api/photos',
      headers: { 'x-session-token': uploaderToken, 'content-type': contentType },
      bodyBytes: bytes,
    });
    expect(r.status).toBe(415);
  });

  it('rejects oversized file with 413', async () => {
    const { uploaderToken } = await setupCouple();
    const big = new Uint8Array(handle.services.config.photo.maxBytes + 10);
    const { bytes, contentType } = await buildMultipart([
      {
        name: 'file',
        value: big,
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      },
    ]);
    const r = await invoke(photosCreateHandler, {
      method: 'POST',
      path: '/api/photos',
      headers: { 'x-session-token': uploaderToken, 'content-type': contentType },
      bodyBytes: bytes,
    });
    expect(r.status).toBe(413);
  });

  it('lists photos with pagination', async () => {
    const { uploaderToken } = await setupCouple();
    for (let i = 0; i < 3; i++) await uploadPhoto(uploaderToken, `p${i}.jpg`);
    const r = await invoke(photosListHandler, {
      method: 'GET',
      path: '/api/photos',
      headers: { 'x-session-token': uploaderToken },
      query: { limit: '2' },
    });
    expect(r.status).toBe(200);
    const body = r.jsonBody as PhotoListResponse;
    expect(body.photos.length).toBe(2);
    expect(body.nextCursor).not.toBeNull();
    const r2 = await invoke(photosListHandler, {
      method: 'GET',
      path: '/api/photos',
      headers: { 'x-session-token': uploaderToken },
      query: { limit: '2', cursor: body.nextCursor! },
    });
    const body2 = r2.jsonBody as PhotoListResponse;
    expect(body2.photos.length).toBe(1);
  });

  it('get returns 403 for stranger', async () => {
    const { uploaderToken, strangerToken } = await setupCouple();
    const create = await uploadPhoto(uploaderToken);
    const id = (create.jsonBody as PhotoResponse).photo.id;
    const r = await invoke(photosGetHandler, {
      method: 'GET',
      path: `/api/photos/${id}`,
      headers: { 'x-session-token': strangerToken },
      params: { id },
    });
    expect(r.status).toBe(403);
  });

  it('get returns 404 for missing UUID', async () => {
    const { uploaderToken } = await setupCouple();
    const id = '11111111-1111-4111-8111-111111111111';
    const r = await invoke(photosGetHandler, {
      method: 'GET',
      path: `/api/photos/${id}`,
      headers: { 'x-session-token': uploaderToken },
      params: { id },
    });
    expect(r.status).toBe(404);
  });

  it('get returns 422 for invalid UUID path', async () => {
    const { uploaderToken } = await setupCouple();
    const r = await invoke(photosGetHandler, {
      method: 'GET',
      path: '/api/photos/not-a-uuid',
      headers: { 'x-session-token': uploaderToken },
      params: { id: 'not-a-uuid' },
    });
    expect(r.status).toBe(422);
  });

  it('delete by uploader works (204)', async () => {
    const { uploaderToken } = await setupCouple();
    const create = await uploadPhoto(uploaderToken);
    const id = (create.jsonBody as PhotoResponse).photo.id;
    const r = await invoke(photosDeleteHandler, {
      method: 'DELETE',
      path: `/api/photos/${id}`,
      headers: { 'x-session-token': uploaderToken },
      params: { id },
    });
    expect(r.status).toBe(204);
  });

  it('delete by partner works', async () => {
    const { uploaderToken, partnerToken } = await setupCouple();
    const create = await uploadPhoto(uploaderToken);
    const id = (create.jsonBody as PhotoResponse).photo.id;
    const r = await invoke(photosDeleteHandler, {
      method: 'DELETE',
      path: `/api/photos/${id}`,
      headers: { 'x-session-token': partnerToken },
      params: { id },
    });
    expect(r.status).toBe(204);
  });

  it('delete by stranger returns 403', async () => {
    const { uploaderToken, strangerToken } = await setupCouple();
    const create = await uploadPhoto(uploaderToken);
    const id = (create.jsonBody as PhotoResponse).photo.id;
    const r = await invoke(photosDeleteHandler, {
      method: 'DELETE',
      path: `/api/photos/${id}`,
      headers: { 'x-session-token': strangerToken },
      params: { id },
    });
    expect(r.status).toBe(403);
  });

  it('regenerate caption updates the photo', async () => {
    const { uploaderToken } = await setupCouple();
    vi.spyOn(handle.caption, 'generate').mockResolvedValueOnce({
      caption: 'first',
      fromModel: true,
    });
    const create = await uploadPhoto(uploaderToken);
    const id = (create.jsonBody as PhotoResponse).photo.id;

    vi.spyOn(handle.caption, 'generate').mockResolvedValueOnce({
      caption: 'second',
      fromModel: true,
    });
    const r = await invoke(photosRegenerateCaptionHandler, {
      method: 'POST',
      path: `/api/photos/${id}/regenerate-caption`,
      headers: { 'x-session-token': uploaderToken },
      params: { id },
    });
    expect(r.status).toBe(200);
    const body = r.jsonBody as PhotoResponse;
    expect(body.photo.caption).toBe('second');
  });

  it('regenerate handles caption failure', async () => {
    const { uploaderToken } = await setupCouple();
    const create = await uploadPhoto(uploaderToken);
    const id = (create.jsonBody as PhotoResponse).photo.id;
    vi.spyOn(handle.caption, 'generate').mockRejectedValueOnce(new Error('boom'));
    const r = await invoke(photosRegenerateCaptionHandler, {
      method: 'POST',
      path: `/api/photos/${id}/regenerate-caption`,
      headers: { 'x-session-token': uploaderToken },
      params: { id },
    });
    expect(r.status).toBe(200);
    expect((r.jsonBody as PhotoResponse).photo.captionStatus).toBe('failed');
  });
});
