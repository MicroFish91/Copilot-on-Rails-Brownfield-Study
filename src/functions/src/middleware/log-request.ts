import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getServices } from '../services/registry';

export type Handler = (
  req: HttpRequest,
  ctx: InvocationContext,
) => Promise<HttpResponseInit>;

export function logRequest(handler: Handler): Handler {
  return async (req, ctx) => {
    const start = Date.now();
    const path = new URL(req.url).pathname;
    const result = await handler(req, ctx);
    const durationMs = Date.now() - start;
    try {
      const { logger } = getServices();
      logger.info(
        { method: req.method, path, status: result.status ?? 200, durationMs },
        'request',
      );
    } catch {
      /* logger unavailable */
    }
    return result;
  };
}
