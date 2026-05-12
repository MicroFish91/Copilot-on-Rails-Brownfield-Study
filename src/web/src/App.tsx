import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth, RequireCouple } from './auth/guards';
import { OnboardCouplePage } from './pages/OnboardCouplePage';
import { RegisterPage } from './pages/RegisterPage';
import { ScrapbookPage } from './pages/ScrapbookPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignInPage } from './pages/SignInPage';
import { NotFoundPage } from './pages/NotFoundPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/scrapbook" replace />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/onboard"
          element={
            <RequireAuth>
              <OnboardCouplePage />
            </RequireAuth>
          }
        />
        <Route
          path="/scrapbook"
          element={
            <RequireAuth>
              <RequireCouple>
                <ScrapbookPage />
              </RequireCouple>
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
