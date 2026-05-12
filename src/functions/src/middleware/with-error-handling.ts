import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZodError } from 'zod';
import type { ApiErrorResponse, ErrorCode } from '@duo-scrapbook/shared';
import { AppError } from '../errors/errors';
import { getServices } from '../services/registry';

export type WrappedHandler = (
  req: HttpRequest,
  ctx: InvocationContext,
) => Promise<HttpResponseInit>;

function buildBody(code: ErrorCode, message: string, details?: unknown): ApiErrorResponse {
  const body: ApiErrorResponse = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return body;
}

function jsonError(status: number, body: ApiErrorResponse): HttpResponseInit {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    jsonBody: body,
  };
}

export function withErrorHandling(handler: WrappedHandler): WrappedHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return jsonError(err.status, buildBody(err.code, err.message, err.details));
      }
      if (err instanceof ZodError) {
        return jsonError(
          422,
          buildBody('VALIDATION_ERROR', 'Invalid request payload', err.flatten()),
        );
      }
      const services = safeGetServices();
      services?.logger.error({ err }, 'Unhandled handler error');
      const isProd = (services?.config.nodeEnv ?? 'production') === 'production';
      const message =
        isProd || !(err instanceof Error) ? 'Internal server error' : err.message;
      return jsonError(500, buildBody('INTERNAL_ERROR', message));
    }
  };
}

function safeGetServices() {
  try {
    return getServices();
  } catch {
    return null;
  }
}
