import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { photoIdParamSchema } from '@duo-scrapbook/shared';
import { requireCouple, requireSameCouple, requireUser } from '../auth/middleware';
import { NotFoundError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parsePath } from '../middleware/validate';
import { getServices } from '../services/registry';

export const photosImageHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    requireCouple(user);
    const { id } = parsePath(req, photoIdParamSchema);
    const photo = await services.database.findById('photo', id);
    if (!photo) throw new NotFoundError('Photo not found');
    requireSameCouple(user, photo);

    const bytes = await services.blobStorage.get(photo.blobName);

    return {
      status: 200,
      headers: {
        'Content-Type': photo.mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
      body: bytes,
    };
  },
);

app.http('photos-image', {
  route: 'photos/{id}/image',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: photosImageHandler,
});
