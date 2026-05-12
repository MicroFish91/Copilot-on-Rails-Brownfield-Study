import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import type { MeResponse } from '@duo-scrapbook/shared';
import { requireUser } from '../auth/middleware';
import { withErrorHandling } from '../middleware/with-error-handling';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';
import { toPublicUser } from '../utils/users';

export const authMeHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    const couple = user.coupleId
      ? await services.database.findById('couple', user.coupleId)
      : null;
    const resp: MeResponse = { user: toPublicUser(user), couple };
    return jsonResponse(200, resp);
  },
);

app.http('auth-me', {
  route: 'auth/me',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: authMeHandler,
});
