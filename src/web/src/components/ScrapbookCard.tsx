import type { Photo, User } from '@duo-scrapbook/shared';

interface ScrapbookCardProps {
  photo: Photo;
  uploader: User | null;
  isMine: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return dateFmt.format(new Date(iso));
  } catch {
    return '';
  }
}

export function ScrapbookCard({ photo, uploader, isMine, onClick, onDelete, onRegenerate }: ScrapbookCardProps) {
  const taken = formatDate(photo.takenAt ?? photo.createdAt);
  return (
    <article className="scrapbook-card">
      <button
        type="button"
        className="scrapbook-card__photo"
        onClick={onClick}
        aria-label={`Open photo: ${photo.caption}`}
      >
        <img src={photo.blobUrl} alt={photo.caption} loading="lazy" />
      </button>
      <div className="scrapbook-card__body">
        <p className="scrapbook-card__caption">{photo.caption}</p>
        <div className="scrapbook-card__meta">
          <span className="scrapbook-card__by">{uploader?.displayName ?? 'A friend'}</span>
          <span className="scrapbook-card__dot" aria-hidden="true">
            ·
          </span>
          <span className="scrapbook-card__date">{taken}</span>
        </div>
        <div className="scrapbook-card__actions">
          <button type="button" className="link" onClick={onRegenerate}>
            Regenerate caption
          </button>
          {isMine && (
            <button
              type="button"
              className="link link--danger"
              onClick={() => {
                if (window.confirm('Delete this photo? This cannot be undone.')) {
                  onDelete();
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
