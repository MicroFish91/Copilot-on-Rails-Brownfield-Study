import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { requireUser } from '../auth/middleware';
import { revokeSession } from '../auth/session';
import { withErrorHandling } from '../middleware/with-error-handling';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';

export const authLogoutHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { session } = await requireUser(req, services);
    await revokeSession(services, session.id);
    return jsonResponse(204);
  },
);

app.http('auth-logout', {
  route: 'auth/logout',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: authLogoutHandler,
});
