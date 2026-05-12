import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import {
  type Photo,
  type PhotoResponse,
  photoUploadMetadataSchema,
} from '@duo-scrapbook/shared';
import { requireCouple, requireUser } from '../auth/middleware';
import {
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';
import { newUuid } from '../utils/ids';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const photosCreateHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    const coupleId = requireCouple(user);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ValidationError('Request must be multipart/form-data');
    }

    const file = form.get('file');
    if (!file || typeof file === 'string') {
      throw new ValidationError('Missing file part');
    }
    const blob = file as Blob & { name?: string; type?: string };
    const mimeType = (blob.type || 'application/octet-stream').toLowerCase();
    if (!services.config.photo.allowedMimeTypes.includes(mimeType)) {
      throw new UnsupportedMediaTypeError(`Mime type not allowed: ${mimeType}`);
    }
    const arr = await blob.arrayBuffer();
    const bytes = Buffer.from(arr);
    if (bytes.length === 0) throw new ValidationError('File is empty');
    if (bytes.length > services.config.photo.maxBytes) {
      throw new PayloadTooLargeError(
        `File exceeds ${services.config.photo.maxBytes} bytes`,
      );
    }

    const takenAtRaw = form.get('takenAt');
    const meta = photoUploadMetadataSchema.parse({
      ...(typeof takenAtRaw === 'string' ? { takenAt: takenAtRaw } : {}),
    });

    const ext = EXT_BY_MIME[mimeType] ?? 'bin';
    const blobName = `${coupleId}/${newUuid()}.${ext}`;
    const info = await services.blobStorage.put(blobName, bytes, {
      contentType: mimeType,
      metadata: { coupleId, uploadedBy: user.id },
    });

    const photo = (await services.database.create('photo', {
      coupleId,
      uploadedByUserId: user.id,
      blobName,
      blobUrl: info.url,
      mimeType,
      sizeBytes: bytes.length,
      caption: '',
      captionStatus: 'pending',
      takenAt: meta.takenAt ?? null,
    })) as Photo;

    let finalPhoto: Photo = photo;
    try {
      const captionResult = await services.caption.generate({
        bytes,
        mimeType,
        hints: { uploaderDisplayName: user.displayName, takenAt: meta.takenAt },
      });
      finalPhoto = await services.database.update('photo', photo.id, {
        caption: captionResult.caption,
        captionStatus: captionResult.fromModel ? 'ready' : 'failed',
      });
    } catch (err) {
      services.logger.warn({ err, photoId: photo.id }, 'Caption generation failed');
      finalPhoto = await services.database.update('photo', photo.id, {
        caption: 'A new memory.',
        captionStatus: 'failed',
      });
    }

    const resp: PhotoResponse = { photo: finalPhoto };
    return jsonResponse(201, resp);
  },
);

app.http('photos-create', {
  route: 'photos',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: photosCreateHandler,
});
