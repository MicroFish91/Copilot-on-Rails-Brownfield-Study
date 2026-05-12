import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Photo } from '@duo-scrapbook/shared';
import { usePhotos } from '../../src/hooks/usePhotos';
import { apiClient, ApiError } from '../../src/api/client';

const samplePhoto: Photo = {
  id: 'p1',
  coupleId: 'c1',
  uploadedByUserId: 'u1',
  blobName: 'demo.jpg',
  blobUrl: 'https://example.com/demo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 100,
  caption: 'a cap',
  captionStatus: 'ready',
  takenAt: null,
  createdAt: '2026-05-06T12:00:00.000Z',
  updatedAt: '2026-05-06T12:00:00.000Z',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('usePhotos hook', () => {
  it('moves loading → empty when the list is empty', async () => {
    vi.spyOn(apiClient, 'listPhotos').mockResolvedValue({ photos: [], nextCursor: null });
    const { result } = renderHook(() => usePhotos());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('moves loading → ready when the list has photos', async () => {
    vi.spyOn(apiClient, 'listPhotos').mockResolvedValue({
      photos: [samplePhoto],
      nextCursor: null,
    });
    const { result } = renderHook(() => usePhotos());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.photos).toHaveLength(1);
  });

  it('moves loading → error on failure', async () => {
    vi.spyOn(apiClient, 'listPhotos').mockRejectedValue(
      new ApiError(500, 'INTERNAL_ERROR', 'boom'),
    );
    const { result } = renderHook(() => usePhotos());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toContain('boom');
  });

  it('upload prepends a photo and keeps status ready', async () => {
    vi.spyOn(apiClient, 'listPhotos').mockResolvedValue({
      photos: [samplePhoto],
      nextCursor: null,
    });
    const newPhoto: Photo = { ...samplePhoto, id: 'p2', caption: 'new one' };
    vi.spyOn(apiClient, 'uploadPhoto').mockResolvedValue({ photo: newPhoto });

    const { result } = renderHook(() => usePhotos());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.upload(new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
    });
    expect(result.current.photos[0]?.id).toBe('p2');
    expect(result.current.photos).toHaveLength(2);
  });

  it('remove drops the photo and rolls back on API failure', async () => {
    vi.spyOn(apiClient, 'listPhotos').mockResolvedValue({
      photos: [samplePhoto],
      nextCursor: null,
    });
    vi.spyOn(apiClient, 'deletePhoto').mockRejectedValue(
      new ApiError(500, 'INTERNAL_ERROR', 'nope'),
    );

    const { result } = renderHook(() => usePhotos());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await expect(result.current.remove(samplePhoto.id)).rejects.toBeInstanceOf(ApiError);
    });
    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0]?.id).toBe(samplePhoto.id);
  });

  it('regenerate updates the photo in place', async () => {
    vi.spyOn(apiClient, 'listPhotos').mockResolvedValue({
      photos: [samplePhoto],
      nextCursor: null,
    });
    const updated: Photo = { ...samplePhoto, caption: 'fresh caption' };
    vi.spyOn(apiClient, 'regenerateCaption').mockResolvedValue({ photo: updated });

    const { result } = renderHook(() => usePhotos());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.regenerate(samplePhoto.id);
    });
    expect(result.current.photos[0]?.caption).toBe('fresh caption');
  });
});
