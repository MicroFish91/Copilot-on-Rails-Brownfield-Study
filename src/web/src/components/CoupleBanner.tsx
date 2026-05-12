import type { Couple, User } from '@duo-scrapbook/shared';

interface CoupleBannerProps {
  couple: Couple;
  members: User[];
  currentUserId: string;
}

export function CoupleBanner({ couple, members, currentUserId }: CoupleBannerProps) {
  const partner = members.find((m) => m.id !== currentUserId);
  return (
    <header className="couple-banner">
      <div className="couple-banner__title">
        <h1>{couple.name}</h1>
        <p className="couple-banner__sub">
          {members.length === 1
            ? 'Waiting for your partner to join…'
            : partner
              ? `You & ${partner.displayName}`
              : 'Together'}
        </p>
      </div>
      <div className="couple-banner__avatars" aria-hidden="true">
        {members.map((m) => (
          <span key={m.id} className="avatar" title={m.displayName}>
            {m.displayName.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
    </header>
  );
}
