import { useEffect } from 'react';
import type { Photo } from '@duo-scrapbook/shared';

interface PhotoLightboxProps {
  photo: Photo | null;
  onClose: () => void;
}

export function PhotoLightbox({ photo, onClose }: PhotoLightboxProps) {
  useEffect(() => {
    if (!photo) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photo, onClose]);

  if (!photo) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.caption} onClick={onClose}>
      <figure className="lightbox__inner" onClick={(e) => e.stopPropagation()}>
        <img src={photo.blobUrl} alt={photo.caption} />
        <figcaption className="lightbox__caption">{photo.caption}</figcaption>
        <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </figure>
    </div>
  );
}
