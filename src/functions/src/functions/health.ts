import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import type { HealthResponse, HealthStatus } from '@duo-scrapbook/shared';
import { withErrorHandling } from '../middleware/with-error-handling';
import { getServices } from '../services/registry';
import { jsonResponse } from '../utils/http';

async function probe(fn: () => Promise<boolean>): Promise<HealthStatus> {
  try {
    return (await fn()) ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  }
}

export const healthHandler = withErrorHandling(
  async (_req: HttpRequest): Promise<HttpResponseInit> => {
    const services = getServices();
    const [db, blob, caption] = await Promise.all([
      probe(() => services.database.ping()),
      probe(() => services.blobStorage.ping()),
      probe(() => services.caption.ping()),
    ]);

    const essentialsOk = db === 'healthy' && blob === 'healthy';
    const overall: HealthStatus = !essentialsOk
      ? 'unhealthy'
      : caption === 'healthy'
        ? 'healthy'
        : 'degraded';

    const body: HealthResponse = {
      status: overall,
      services: {
        database: { status: db },
        blobStorage: { status: blob },
        caption: { status: caption },
      },
    };
    const status = overall === 'unhealthy' ? 503 : 200;
    return jsonResponse(status, body);
  },
);

app.http('health', {
  route: 'health',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: healthHandler,
});
