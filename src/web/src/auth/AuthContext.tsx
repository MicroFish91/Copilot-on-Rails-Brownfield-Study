import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Couple, User } from '@duo-scrapbook/shared';
import { ApiError, apiClient, setStoredToken } from '../api/client';

interface AuthState {
  user: User | null;
  couple: Couple | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
  setCouple(couple: Couple | null): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    couple: null,
    status: 'loading',
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const me = await apiClient.me();
      setState({ user: me.user, couple: me.couple, status: 'authenticated', error: null });
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized()) {
        setStoredToken(null);
        setState({ user: null, couple: null, status: 'unauthenticated', error: null });
        return;
      }
      setState({
        user: null,
        couple: null,
        status: 'unauthenticated',
        error: err instanceof Error ? err.message : 'Failed to load session',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const res = await apiClient.login({ email, password });
      setStoredToken(res.sessionToken);
      await refresh();
    },
    [refresh],
  );

  const register = useCallback<AuthContextValue['register']>(
    async (email, password, displayName) => {
      const res = await apiClient.register({ email, password, displayName });
      setStoredToken(res.sessionToken);
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    try {
      await apiClient.logout();
    } catch {
      // logout is best-effort — local state still clears below
    } finally {
      setStoredToken(null);
      setState({ user: null, couple: null, status: 'unauthenticated', error: null });
    }
  }, []);

  const setCouple = useCallback<AuthContextValue['setCouple']>((couple) => {
    setState((s) => ({ ...s, couple }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, register, signOut, refresh, setCouple }),
    [state, signIn, register, signOut, refresh, setCouple],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
