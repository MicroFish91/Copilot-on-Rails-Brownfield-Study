import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import {
  type CreateCoupleResponse,
  createCoupleRequestSchema,
} from '@duo-scrapbook/shared';
import { requireUser } from '../auth/middleware';
import { ConflictError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parseJsonBody } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';
import { generateInviteCode } from '../utils/invite-codes';

const INVITE_TTL_DAYS = 14;

export const couplesCreateHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    if (user.coupleId) throw new ConflictError('Already part of a couple');
    const body = await parseJsonBody(req, createCoupleRequestSchema);

    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const result = await services.database.transaction(async (tx) => {
      const couple = await tx.create('couple', { name: body.name });
      await tx.update('user', user.id, { coupleId: couple.id });
      const invite = await tx.create('invitation', {
        coupleId: couple.id,
        createdByUserId: user.id,
        code: generateInviteCode(),
        status: 'pending',
        expiresAt,
      });
      return { couple, invite };
    });

    const resp: CreateCoupleResponse = result;
    return jsonResponse(201, resp);
  },
);

app.http('couples-create', {
  route: 'couples',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: couplesCreateHandler,
});
