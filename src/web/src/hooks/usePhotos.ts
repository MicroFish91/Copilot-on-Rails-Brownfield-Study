import { useCallback, useEffect, useRef, useState } from 'react';
import type { Photo } from '@duo-scrapbook/shared';
import { apiClient } from '../api/client';

export type PhotoListState =
  | { status: 'loading'; photos: never[]; error: null }
  | { status: 'error'; photos: never[]; error: string }
  | { status: 'empty'; photos: never[]; error: null }
  | { status: 'ready'; photos: Photo[]; error: null };

export function usePhotos() {
  const [state, setState] = useState<PhotoListState>({ status: 'loading', photos: [], error: null });
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: 'loading', photos: [], error: null });
    try {
      const res = await apiClient.listPhotos();
      if (ctrl.signal.aborted) return;
      if (res.photos.length === 0) {
        setState({ status: 'empty', photos: [], error: null });
      } else {
        setState({ status: 'ready', photos: res.photos, error: null });
      }
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setState({
        status: 'error',
        photos: [],
        error: err instanceof Error ? err.message : 'Failed to load photos',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      abortRef.current?.abort();
    };
  }, [refresh]);

  const upload = useCallback(async (file: File): Promise<Photo> => {
    const { photo } = await apiClient.uploadPhoto(file);
    setState((s) => {
      const next = s.status === 'ready' ? [photo, ...s.photos] : [photo];
      return { status: 'ready', photos: next, error: null };
    });
    return photo;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const snapshot = stateRef.current.status === 'ready' ? stateRef.current.photos : [];
    setState((s) => {
      const current = s.status === 'ready' ? s.photos : [];
      const remaining = current.filter((p) => p.id !== id);
      if (remaining.length === 0) return { status: 'empty', photos: [], error: null };
      return { status: 'ready', photos: remaining, error: null };
    });
    try {
      await apiClient.deletePhoto(id);
    } catch (err) {
      if (snapshot.length > 0) setState({ status: 'ready', photos: snapshot, error: null });
      throw err;
    }
  }, []);

  const regenerate = useCallback(async (id: string): Promise<Photo> => {
    const { photo } = await apiClient.regenerateCaption(id);
    setState((s) => {
      if (s.status !== 'ready') return s;
      return {
        status: 'ready',
        error: null,
        photos: s.photos.map((p) => (p.id === id ? photo : p)),
      };
    });
    return photo;
  }, []);

  return { ...state, refresh, upload, remove, regenerate };
}
