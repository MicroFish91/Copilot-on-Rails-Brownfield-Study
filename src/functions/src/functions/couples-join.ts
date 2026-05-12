import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import {
  type JoinCoupleResponse,
  joinCoupleRequestSchema,
} from '@duo-scrapbook/shared';
import { requireUser } from '../auth/middleware';
import { ConflictError, NotFoundError } from '../errors/errors';
import { withErrorHandling } from '../middleware/with-error-handling';
import { parseJsonBody } from '../middleware/validate';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';

export const couplesJoinHandler = withErrorHandling(
  async (req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const { user } = await requireUser(req, services);
    if (user.coupleId) throw new ConflictError('Already part of a couple');
    const body = await parseJsonBody(req, joinCoupleRequestSchema);

    const invitation = await services.database.findOne('invitation', {
      code: body.code,
      status: 'pending',
    });
    if (!invitation) throw new NotFoundError('Invite code not found or already used');
    if (Date.parse(invitation.expiresAt) <= Date.now()) {
      throw new NotFoundError('Invite code has expired');
    }
    if (invitation.createdByUserId === user.id) {
      throw new ConflictError('Cannot join a couple you created via your own invite');
    }

    const couple = await services.database.transaction(async (tx) => {
      await tx.update('invitation', invitation.id, { status: 'accepted' });
      await tx.update('user', user.id, { coupleId: invitation.coupleId });
      const c = await tx.findById('couple', invitation.coupleId);
      if (!c) throw new NotFoundError('Couple not found for invite');
      return c;
    });

    const resp: JoinCoupleResponse = { couple };
    return jsonResponse(200, resp);
  },
);

app.http('couples-join', {
  route: 'couples/join',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: couplesJoinHandler,
});
