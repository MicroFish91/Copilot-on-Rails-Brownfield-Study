/**
 * Domain entity types — single source of truth for both backend and frontend.
 * Snake_case columns in the DB are mapped to camelCase here at the repo layer.
 */

export type Iso8601 = string;
export type Uuid = string;

export interface User {
  id: Uuid;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  coupleId: Uuid | null;
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

export interface Couple {
  id: Uuid;
  name: string;
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invitation {
  id: Uuid;
  coupleId: Uuid;
  createdByUserId: Uuid;
  code: string;
  status: InvitationStatus;
  expiresAt: Iso8601;
  createdAt: Iso8601;
}

export type CaptionStatus = 'pending' | 'ready' | 'failed';

export interface Photo {
  id: Uuid;
  coupleId: Uuid;
  uploadedByUserId: Uuid | null;
  blobName: string;
  blobUrl: string;
  mimeType: string;
  sizeBytes: number;
  caption: string;
  captionStatus: CaptionStatus;
  takenAt: Iso8601 | null;
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

export interface Session {
  id: Uuid;
  userId: Uuid;
  tokenHash: string;
  expiresAt: Iso8601;
  createdAt: Iso8601;
}
