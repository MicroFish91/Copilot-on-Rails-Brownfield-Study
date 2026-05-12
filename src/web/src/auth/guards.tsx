import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="auth-pending" aria-busy="true">
        Loading…
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function RequireCouple({ children }: { children: ReactNode }) {
  const { user, couple, status } = useAuth();
  if (status === 'loading') return <div className="auth-pending">Loading…</div>;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (!couple) return <Navigate to="/onboard" replace />;
  return <>{children}</>;
}
