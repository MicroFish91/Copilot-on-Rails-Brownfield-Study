import { useRef, useState } from 'react';

interface PhotoUploaderProps {
  maxBytes: number;
  allowedMime: readonly string[];
  onUpload: (file: File) => Promise<unknown>;
}

export function PhotoUploader({ maxBytes, allowedMime, onUpload }: PhotoUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!allowedMime.includes(file.type)) {
      setError(`Unsupported file type: ${file.type || 'unknown'}`);
      return;
    }
    if (file.size > maxBytes) {
      setError(`File is too large (max ${(maxBytes / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="photo-uploader">
      <label className="photo-uploader__drop">
        <input
          ref={inputRef}
          type="file"
          accept={allowedMime.join(',')}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <span className="photo-uploader__cta">
          {busy ? 'Uploading + writing caption…' : '+ Add a photo'}
        </span>
        <span className="photo-uploader__hint">JPEG, PNG, WebP, or GIF · up to {(maxBytes / 1024 / 1024).toFixed(0)} MB</span>
      </label>
      {error && (
        <p className="photo-uploader__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
