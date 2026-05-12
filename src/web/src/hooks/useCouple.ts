import { useCallback, useEffect, useState } from 'react';
import type { Couple, Invitation, User } from '@duo-scrapbook/shared';
import { ApiError, apiClient } from '../api/client';

interface CoupleState {
  loading: boolean;
  couple: Couple | null;
  members: User[];
  invitation: Invitation | null;
  error: string | null;
}

export function useCouple() {
  const [state, setState] = useState<CoupleState>({
    loading: true,
    couple: null,
    members: [],
    invitation: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await apiClient.myCouple();
      setState({
        loading: false,
        couple: res.couple,
        members: res.members,
        invitation: null,
        error: null,
      });
    } catch (err) {
      // 404 = user is not in a couple yet (expected onboarding state)
      if (err instanceof ApiError && err.status === 404) {
        setState({ loading: false, couple: null, members: [], invitation: null, error: null });
        return;
      }
      setState({
        loading: false,
        couple: null,
        members: [],
        invitation: null,
        error: err instanceof Error ? err.message : 'Failed to load couple',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCouple = useCallback(async (name: string) => {
    const res = await apiClient.createCouple({ name });
    try {
      const fresh = await apiClient.myCouple();
      setState({
        loading: false,
        couple: fresh.couple,
        members: fresh.members,
        invitation: res.invite,
        error: null,
      });
    } catch {
      setState({
        loading: false,
        couple: res.couple,
        members: [],
        invitation: res.invite,
        error: null,
      });
    }
    return res;
  }, []);

  const joinCouple = useCallback(
    async (code: string) => {
      const res = await apiClient.joinCouple({ code });
      await refresh();
      return res;
    },
    [refresh],
  );

  const leaveCouple = useCallback(async () => {
    await apiClient.leaveCouple();
    await refresh();
  }, [refresh]);

  return { ...state, refresh, createCouple, joinCouple, leaveCouple };
}
