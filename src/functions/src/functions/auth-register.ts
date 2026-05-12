import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import {
  type AuthSessionResponse,
  registerRequestSchema,
} from '@duo-scrapbook/shared';
import { hashPassword } from '../auth/password';
import { issueSession } from '../auth/session';
import { ConflictError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parseJsonBody } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';
import { toPublicUser, type UserRow } from '../utils/users';

export const authRegisterHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const body = await parseJsonBody(req, registerRequestSchema);

    const existing = await services.database.findOne('user', { email: body.email });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await hashPassword(body.password);
    const user = (await services.database.create('user', {
      email: body.email,
      displayName: body.displayName,
      avatarUrl: null,
      coupleId: null,
      passwordHash,
    } as never)) as UserRow;

    const issued = await issueSession(services, user.id);
    const resp: AuthSessionResponse = {
      user: toPublicUser(user),
      sessionToken: issued.token,
    };
    return jsonResponse(201, resp);
  },
);

app.http('auth-register', {
  route: 'auth/register',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: authRegisterHandler,
});
