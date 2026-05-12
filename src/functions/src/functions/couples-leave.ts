import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { requireCouple, requireUser } from '../auth/middleware';
import { withErrorHandling } from '../middleware/with-error-handling';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';

export const couplesLeaveHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    requireCouple(user);
    await services.database.update('user', user.id, { coupleId: null });
    return jsonResponse(204);
  },
);

app.http('couples-leave', {
  route: 'couples/me/leave',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: couplesLeaveHandler,
});
