import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { photoIdParamSchema } from '@duo-scrapbook/shared';
import { requireCouple, requireSameCouple, requireUser } from '../auth/middleware';
import { NotFoundError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parsePath } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';

export const photosDeleteHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    requireCouple(user);
    const { id } = parsePath(req, photoIdParamSchema);
    const photo = await services.database.findById('photo', id);
    if (!photo) throw new NotFoundError('Photo not found');
    requireSameCouple(user, photo);
    await services.blobStorage.delete(photo.blobName);
    await services.database.delete('photo', photo.id);
    return jsonResponse(204);
  },
);

app.http('photos-delete', {
  route: 'photos/{id}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: photosDeleteHandler,
});
