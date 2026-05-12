import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import type { CoupleWithMembersResponse } from '@duo-scrapbook/shared';
import { requireCouple, requireUser } from '../auth/middleware';
import { NotFoundError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';
import { toPublicUser } from '../utils/users';

export const couplesMeHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    const coupleId = requireCouple(user);
    const couple = await services.database.findById('couple', coupleId);
    if (!couple) throw new NotFoundError('Couple not found');
    const members = await services.database.list('user', {
      where: { coupleId },
      orderBy: { column: 'createdAt', direction: 'asc' },
      limit: 10,
    });
    const resp: CoupleWithMembersResponse = {
      couple,
      members: members.items.map(toPublicUser),
    };
    return jsonResponse(200, resp);
  },
);

app.http('couples-me', {
  route: 'couples/me',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: couplesMeHandler,
});
