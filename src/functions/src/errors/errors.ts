/**
 * Custom error classes — one per HTTP error code in the API contract.
 * The handle-error middleware maps these to ApiErrorResponse shapes.
 */

import type { ErrorCode } from '@duo-scrapbook/shared';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, status: number, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', 422, message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super('BAD_REQUEST', 400, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', 409, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', 403, message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super('PAYLOAD_TOO_LARGE', 413, message);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string) {
    super('UNSUPPORTED_MEDIA_TYPE', 415, message);
  }
}
