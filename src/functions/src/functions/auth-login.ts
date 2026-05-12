import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import {
  type AuthSessionResponse,
  loginRequestSchema,
} from '@duo-scrapbook/shared';
import { verifyPassword } from '../auth/password';
import { issueSession } from '../auth/session';
import { UnauthorizedError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parseJsonBody } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';
import { toPublicUser, type UserRow } from '../utils/users';

export const authLoginHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const body = await parseJsonBody(req, loginRequestSchema);

    const user = (await services.database.findOne('user', {
      email: body.email,
    })) as UserRow | null;
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid email or password');

    const issued = await issueSession(services, user.id);
    const resp: AuthSessionResponse = {
      user: toPublicUser(user),
      sessionToken: issued.token,
    };
    return jsonResponse(200, resp);
  },
);

app.http('auth-login', {
  route: 'auth/login',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: authLoginHandler,
});
