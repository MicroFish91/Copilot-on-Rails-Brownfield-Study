import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { withErrorHandling } from '../middleware/with-error-handling';
import { OPENAPI_SPEC } from '../openapi/spec';
import { jsonResponse } from '../utils/http';

export const openapiHandler = withErrorHandling(
  async (_req: HttpRequest): Promise<HttpResponseInit> => {
    return jsonResponse(200, OPENAPI_SPEC);
  },
);

app.http('openapi', {
  route: 'openapi.json',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: openapiHandler,
});
