import type { Photo, User } from '@duo-scrapbook/shared';
import { ScrapbookCard } from './ScrapbookCard';

interface ScrapbookGridProps {
  photos: Photo[];
  members: User[];
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
  onSelect: (photo: Photo) => void;
}

export function ScrapbookGrid({
  photos,
  members,
  currentUserId,
  onDelete,
  onRegenerate,
  onSelect,
}: ScrapbookGridProps) {
  return (
    <ul className="scrapbook-grid" role="list">
      {photos.map((photo, idx) => {
        const uploader = members.find((m) => m.id === photo.uploadedByUserId) ?? null;
        const tilt = ((idx % 5) - 2) * 0.7;
        return (
          <li key={photo.id} className="scrapbook-grid__item" style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}>
            <ScrapbookCard
              photo={photo}
              uploader={uploader}
              isMine={photo.uploadedByUserId === currentUserId}
              onClick={() => onSelect(photo)}
              onDelete={() => onDelete(photo.id)}
              onRegenerate={() => onRegenerate(photo.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
