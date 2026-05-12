import { useState } from 'react';
import type { Invitation } from '@duo-scrapbook/shared';

interface InviteCodeCardProps {
  invitation: Invitation;
}

export function InviteCodeCard({ invitation }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(invitation.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — non-critical UX hint
    }
  }

  return (
    <aside className="invite-card">
      <p className="invite-card__label">Invite your partner</p>
      <p className="invite-card__code" aria-label="Invite code">
        {invitation.code}
      </p>
      <button type="button" className="invite-card__copy" onClick={copy}>
        {copied ? 'Copied!' : 'Copy code'}
      </button>
      <p className="invite-card__hint">
        They can enter this on the join screen. Expires{' '}
        {new Date(invitation.expiresAt).toLocaleDateString()}.
      </p>
    </aside>
  );
}
