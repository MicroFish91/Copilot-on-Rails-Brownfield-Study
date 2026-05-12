import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import {
  type PhotoListResponse,
  photoListQuerySchema,
} from '@duo-scrapbook/shared';
import { requireCouple, requireUser } from '../auth/middleware';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parseQuery } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';

export const photosListHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    const coupleId = requireCouple(user);
    const query = parseQuery(req, photoListQuerySchema);

    const result = await services.database.list('photo', {
      where: { coupleId },
      orderBy: { column: 'createdAt', direction: 'desc' },
      limit: query.limit,
      ...(query.cursor !== undefined ? { cursor: query.cursor } : {}),
    });

    const resp: PhotoListResponse = {
      photos: result.items,
      nextCursor: result.nextCursor,
    };
    return jsonResponse(200, resp);
  },
);

app.http('photos-list', {
  route: 'photos',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: photosListHandler,
});
