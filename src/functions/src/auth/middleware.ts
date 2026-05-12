import type { HttpRequest } from '@azure/functions';
import type { Photo, Session, User } from '@duo-scrapbook/shared';
import { ForbiddenError, UnauthorizedError } from '../errors/errors';
import type { AppServices } from '../services/registry';
import { validateSessionToken } from './session';

export interface AuthenticatedContext {
  user: User;
  session: Session;
}

export async function requireUser(
  req: HttpRequest,
  services: AppServices,
): Promise<AuthenticatedContext> {
  const token = req.headers.get('x-session-token');
  if (!token) throw new UnauthorizedError('Missing x-session-token header');
  const session = await validateSessionToken(services, token);
  if (!session) throw new UnauthorizedError('Invalid or expired session');
  const user = await services.database.findById('user', session.userId);
  if (!user) throw new UnauthorizedError('Session user not found');
  return { user, session };
}

export function requireCouple(user: User): string {
  if (!user.coupleId) throw new ForbiddenError('User is not part of a couple');
  return user.coupleId;
}

export function requireSameCouple(user: User, photo: Photo): void {
  if (photo.coupleId !== user.coupleId) {
    throw new ForbiddenError('Photo does not belong to your couple');
  }
}
