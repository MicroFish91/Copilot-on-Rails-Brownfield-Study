import type { Couple, Invitation, Photo, User } from './entities.js';

/**
 * Standardized API error response shape — every non-2xx response uses this.
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'BAD_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

// ---- Auth ---------------------------------------------------------------

export interface AuthSessionResponse {
  user: User;
  sessionToken: string;
}

export interface MeResponse {
  user: User;
  couple: Couple | null;
}

// ---- Users --------------------------------------------------------------

export interface UpdateUserResponse {
  user: User;
}

// ---- Couples ------------------------------------------------------------

export interface CreateCoupleResponse {
  couple: Couple;
  invite: Invitation;
}

export interface JoinCoupleResponse {
  couple: Couple;
}

export interface CoupleWithMembersResponse {
  couple: Couple;
  members: User[];
}

// ---- Photos -------------------------------------------------------------

export interface PhotoResponse {
  photo: Photo;
}

export interface PhotoListResponse {
  photos: Photo[];
  nextCursor: string | null;
}

// ---- Health -------------------------------------------------------------

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthResponse {
  status: HealthStatus;
  services: Record<string, { status: HealthStatus; detail?: string }>;
}

// ---- Generic ack --------------------------------------------------------

export interface OkResponse {
  ok: true;
}
