import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCouple } from '../hooks/useCouple';
import { usePhotos } from '../hooks/usePhotos';
import { CoupleBanner } from '../components/CoupleBanner';
import { InviteCodeCard } from '../components/InviteCodeCard';
import { PhotoUploader } from '../components/PhotoUploader';
import { ScrapbookGrid } from '../components/ScrapbookGrid';
import { PhotoLightbox } from '../components/PhotoLightbox';
import type { Photo } from '@duo-scrapbook/shared';

const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export function ScrapbookPage() {
  const { user, signOut } = useAuth();
  const { couple, members, invitation } = useCouple();
  const photos = usePhotos();
  const [selected, setSelected] = useState<Photo | null>(null);

  if (!user || !couple) return null;

  return (
    <main className="scrapbook-page">
      <CoupleBanner couple={couple} members={members} currentUserId={user.id} />
      <nav className="page-nav">
        <Link to="/settings">Settings</Link>
        <button type="button" className="link" onClick={() => void signOut()}>
          Sign out
        </button>
      </nav>

      <PhotoUploader maxBytes={PHOTO_MAX_BYTES} allowedMime={ALLOWED_MIME} onUpload={photos.upload} />
      {invitation && members.length < 2 && <InviteCodeCard invitation={invitation} />}

      {photos.status === 'loading' && <ScrapbookSkeleton />}
      {photos.status === 'error' && (
        <div className="state state--error">
          <p>{photos.error}</p>
          <button type="button" onClick={() => void photos.refresh()}>Try again</button>
        </div>
      )}
      {photos.status === 'empty' && (
        <div className="state state--empty">
          <p>Your scrapbook is empty.</p>
          <p>Add the first photo above — a caption will be written for it automatically.</p>
        </div>
      )}
      {photos.status === 'ready' && (
        <ScrapbookGrid
          photos={photos.photos}
          members={members}
          currentUserId={user.id}
          onSelect={setSelected}
          onDelete={(id) => void photos.remove(id).catch(() => undefined)}
          onRegenerate={(id) => void photos.regenerate(id).catch(() => undefined)}
        />
      )}

      <PhotoLightbox photo={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

function ScrapbookSkeleton() {
  return (
    <ul className="scrapbook-grid scrapbook-grid--skeleton" aria-busy="true" role="list">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="scrapbook-grid__item">
          <div className="scrapbook-card scrapbook-card--skeleton">
            <div className="scrapbook-card__photo scrapbook-card__photo--skeleton" />
            <div className="scrapbook-card__body">
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line--short" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
