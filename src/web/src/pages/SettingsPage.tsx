import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCouple } from '../hooks/useCouple';
import { apiClient } from '../api/client';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, refresh, signOut } = useAuth();
  const { couple, leaveCouple } = useCouple();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.updateMe({ displayName: displayName.trim() });
      await refresh();
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    if (!window.confirm('Leave this scrapbook? Your partner can keep the photos.')) return;
    setBusy(true);
    try {
      await leaveCouple();
      await refresh();
      navigate('/onboard', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="settings-page">
      <header className="settings-page__head">
        <h1>Settings</h1>
        <Link to="/scrapbook">← Back to scrapbook</Link>
      </header>

      <section className="settings-card">
        <h2>Your profile</h2>
        <form className="settings-form" onSubmit={onSave}>
          <label>
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={1}
              maxLength={80}
              required
            />
          </label>
          <p className="settings-form__email">{user.email}</p>
          {error && <p className="settings-form__error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          {savedAt && <span className="settings-form__ok">Saved.</span>}
        </form>
      </section>

      {couple && (
        <section className="settings-card">
          <h2>Scrapbook</h2>
          <p>
            You&apos;re part of <strong>{couple.name}</strong>.
          </p>
          <button type="button" className="link link--danger" onClick={() => void onLeave()}>
            Leave scrapbook
          </button>
        </section>
      )}

      <section className="settings-card">
        <h2>Session</h2>
        <button type="button" onClick={() => void signOut()}>Sign out</button>
      </section>
    </main>
  );
}
