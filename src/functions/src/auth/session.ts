import { createHash, randomBytes } from 'node:crypto';
import type { Session } from '@duo-scrapbook/shared';
import type { AppServices } from '../services/registry';

export interface IssuedSession {
  token: string;
  session: Session;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueSession(
  services: AppServices,
  userId: string,
): Promise<IssuedSession> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + services.config.auth.sessionTtlSeconds * 1000,
  ).toISOString();
  const session = await services.database.create('session', {
    userId,
    tokenHash,
    expiresAt,
  } as Omit<Session, 'id' | 'createdAt'>);
  return { token, session };
}

export async function validateSessionToken(
  services: AppServices,
  token: string,
): Promise<Session | null> {
  const tokenHash = hashSessionToken(token);
  const session = await services.database.findOne('session', { tokenHash });
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) return null;
  return session;
}

export async function revokeSession(
  services: AppServices,
  sessionId: string,
): Promise<void> {
  await services.database.delete('session', sessionId);
}
