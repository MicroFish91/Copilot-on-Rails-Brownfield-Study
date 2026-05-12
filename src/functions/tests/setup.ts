/**
 * Functions test bootstrap — sets safe defaults for env-driven config.
 */
import { beforeEach, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'fatal';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
process.env.PHOTOS_CONTAINER_NAME = 'photos';
process.env.AUTH_BCRYPT_COST = '4';
process.env.AUTH_SESSION_TTL_SECONDS = '3600';
process.env.PHOTO_MAX_BYTES = '10485760';
process.env.PHOTO_ALLOWED_MIME = 'image/jpeg,image/png,image/webp,image/gif';

beforeEach(() => {
  vi.useRealTimers();
});
