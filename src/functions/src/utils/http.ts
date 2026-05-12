import type { HttpResponseInit } from '@azure/functions';

export function jsonResponse(status: number, body?: unknown): HttpResponseInit {
  if (status === 204 || body === undefined) {
    return { status };
  }
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    jsonBody: body,
  };
}
