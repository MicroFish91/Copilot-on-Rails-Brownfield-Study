import type { HttpRequest } from '@azure/functions';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { BadRequestError, ValidationError } from '../errors/errors';

function toValidation(err: unknown, message: string): ValidationError {
  if (err instanceof ZodError) {
    return new ValidationError(message, err.flatten());
  }
  return new ValidationError(message);
}

export async function parseJsonBody<S extends ZodTypeAny>(
  req: HttpRequest,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BadRequestError('Request body is not valid JSON');
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    throw toValidation(err, 'Invalid request body');
  }
}

export function parseQuery<S extends ZodTypeAny>(req: HttpRequest, schema: S): z.infer<S> {
  const obj: Record<string, string> = {};
  for (const [k, v] of req.query.entries()) obj[k] = v;
  try {
    return schema.parse(obj);
  } catch (err) {
    throw toValidation(err, 'Invalid query parameters');
  }
}

export function parsePath<S extends ZodTypeAny>(req: HttpRequest, schema: S): z.infer<S> {
  try {
    return schema.parse(req.params);
  } catch (err) {
    throw toValidation(err, 'Invalid path parameters');
  }
}
