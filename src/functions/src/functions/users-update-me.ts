import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import {
  type UpdateUserResponse,
  updateUserRequestSchema,
} from '@duo-scrapbook/shared';
import { requireUser } from '../auth/middleware';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parseJsonBody } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';
import { toPublicUser } from '../utils/users';

export const usersUpdateMeHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    const body = await parseJsonBody(req, updateUserRequestSchema);
    const updated = await services.database.update('user', user.id, body);
    const resp: UpdateUserResponse = { user: toPublicUser(updated) };
    return jsonResponse(200, resp);
  },
);

app.http('users-update-me', {
  route: 'users/me',
  methods: ['PATCH'],
  authLevel: 'anonymous',
  handler: usersUpdateMeHandler,
});
