import { useEffect, useState } from 'react';

const TOKEN_KEY = 'duo-scrapbook.session-token';

export function useAuthImage(photoId: string): string | undefined {
    const [src, setSrc] = useState<string | undefined>();

    useEffect(() => {
        let revoke: string | undefined;
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        fetch(`/api/photos/${encodeURIComponent(photoId)}/image`, {
            headers: { 'x-session-token': token },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.blob();
            })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                revoke = url;
                setSrc(url);
            })
            .catch(() => setSrc(undefined));

        return () => {
            if (revoke) URL.revokeObjectURL(revoke);
        };
    }, [photoId]);

    return src;
}
