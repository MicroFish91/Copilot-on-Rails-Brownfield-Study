import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCouple } from '../hooks/useCouple';
import { InviteCodeCard } from '../components/InviteCodeCard';

export function OnboardCouplePage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const { couple, invitation, createCouple, joinCouple } = useCouple();
  const [name, setName] = useState(user ? `${user.displayName} & …` : '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy('create');
    try {
      await createCouple(name.trim());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create couple');
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy('join');
    try {
      await joinCouple(code.trim().toUpperCase());
      await refresh();
      navigate('/scrapbook', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join couple');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="onboard-page">
      <h1>One last step</h1>
      <p className="onboard-page__sub">Create a scrapbook for two — or join one your partner started.</p>
      <div className="onboard-page__cols">
        <section className="onboard-card">
          <h2>Start a new scrapbook</h2>
          <form onSubmit={handleCreate} className="onboard-form">
            <label>
              Scrapbook name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Avery & Jordan"
                required
                minLength={1}
                maxLength={80}
              />
            </label>
            <button type="submit" disabled={busy === 'create'}>
              {busy === 'create' ? 'Creating…' : 'Create scrapbook'}
            </button>
          </form>
          {couple && invitation && <InviteCodeCard invitation={invitation} />}
          {couple && (
            <button
              type="button"
              className="onboard-card__continue"
              onClick={() => navigate('/scrapbook', { replace: true })}
            >
              Continue to scrapbook →
            </button>
          )}
        </section>

        <section className="onboard-card">
          <h2>Join your partner&apos;s</h2>
          <form onSubmit={handleJoin} className="onboard-form">
            <label>
              Invite code
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                pattern="[A-Z0-9]{8}"
                maxLength={8}
                placeholder="ABCD1234"
                required
              />
            </label>
            <button type="submit" disabled={busy === 'join'}>
              {busy === 'join' ? 'Joining…' : 'Join scrapbook'}
            </button>
          </form>
        </section>
      </div>
      {error && <p className="onboard-page__error" role="alert">{error}</p>}
    </main>
  );
}
