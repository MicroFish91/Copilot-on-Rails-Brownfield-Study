import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { type PhotoResponse, photoIdParamSchema } from '@duo-scrapbook/shared';
import { requireCouple, requireSameCouple, requireUser } from '../auth/middleware';
import { NotFoundError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parsePath } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';

export const photosRegenerateCaptionHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    requireCouple(user);
    const { id } = parsePath(req, photoIdParamSchema);
    const photo = await services.database.findById('photo', id);
    if (!photo) throw new NotFoundError('Photo not found');
    requireSameCouple(user, photo);

    const bytes = await services.blobStorage.get(photo.blobName);
    let caption = 'A new memory.';
    let status: 'ready' | 'failed' = 'failed';
    try {
      const result = await services.caption.generate({
        bytes,
        mimeType: photo.mimeType,
      });
      caption = result.caption;
      status = result.fromModel ? 'ready' : 'failed';
    } catch (err) {
      services.logger.warn({ err, photoId: photo.id }, 'Caption regeneration failed');
    }

    const updated = await services.database.update('photo', photo.id, {
      caption,
      captionStatus: status,
    });
    const resp: PhotoResponse = { photo: updated };
    return jsonResponse(200, resp);
  },
);

app.http('photos-regenerate-caption', {
  route: 'photos/{id}/regenerate-caption',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: photosRegenerateCaptionHandler,
});
