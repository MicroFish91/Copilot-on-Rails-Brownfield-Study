import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from '../../../src/errors/errors';
import { withErrorHandling } from '../../../src/middleware/with-error-handling';
import { stubContext, buildRequest } from '../../helpers/invoke-handler';
import { useMemoryServices } from '../../helpers/test-services';

const req = () => buildRequest({ method: 'GET', path: '/api/x' });

describe('withErrorHandling', () => {
  beforeEach(() => useMemoryServices());

  it('passes through successful responses', async () => {
    const wrapped = withErrorHandling(async () => ({ status: 200, jsonBody: { ok: true } }));
    const r = await wrapped(req(), stubContext);
    expect(r.status).toBe(200);
  });

  it('maps each AppError subclass to its status', async () => {
    const cases: Array<[AppError, number]> = [
      [new ValidationError('v'), 422],
      [new BadRequestError('b'), 400],
      [new NotFoundError(), 404],
      [new ConflictError('c'), 409],
      [new UnauthorizedError(), 401],
      [new ForbiddenError(), 403],
      [new PayloadTooLargeError('p'), 413],
      [new UnsupportedMediaTypeError('u'), 415],
    ];
    for (const [err, status] of cases) {
      const wrapped = withErrorHandling(async () => {
        throw err;
      });
      const r = await wrapped(req(), stubContext);
      expect(r.status).toBe(status);
      expect((r.jsonBody as { error: { code: string } }).error.code).toBe(err.code);
    }
  });

  it('maps ZodError to 422 VALIDATION_ERROR', async () => {
    const wrapped = withErrorHandling(async () => {
      z.object({ x: z.string() }).parse({});
      return { status: 200 };
    });
    const r = await wrapped(req(), stubContext);
    expect(r.status).toBe(422);
    expect((r.jsonBody as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('maps unknown error to 500 INTERNAL_ERROR', async () => {
    const wrapped = withErrorHandling(async () => {
      throw new Error('boom');
    });
    const r = await wrapped(req(), stubContext);
    expect(r.status).toBe(500);
    expect((r.jsonBody as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR');
  });
});
