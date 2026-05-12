import {
  HttpRequest,
  type HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

export interface InvokeOptions {
  method?: string;
  path: string;
  body?: unknown;
  bodyBytes?: Uint8Array;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
  contentType?: string;
}

export type Handler = (
  req: HttpRequest,
  ctx: InvocationContext,
) => Promise<HttpResponseInit>;

export function buildRequest(options: InvokeOptions): HttpRequest {
  const url = `http://test${options.path}`;
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(options.headers ?? {})) {
    headers[k.toLowerCase()] = v;
  }

  const init: ConstructorParameters<typeof HttpRequest>[0] = {
    method: options.method ?? 'GET',
    url,
    headers,
  };
  if (options.query) init.query = options.query;
  if (options.params) init.params = options.params;

  if (options.bodyBytes) {
    init.body = { bytes: options.bodyBytes };
    if (options.contentType && !headers['content-type']) {
      headers['content-type'] = options.contentType;
    }
  } else if (options.body !== undefined) {
    init.body = { string: JSON.stringify(options.body) };
    if (!headers['content-type']) headers['content-type'] = 'application/json';
  }

  return new HttpRequest(init);
}

const baseCtx: Partial<InvocationContext> = {
  invocationId: 'test',
  functionName: 'test',
  log: () => {},
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export const stubContext = baseCtx as InvocationContext;

export async function invoke(
  handler: Handler,
  options: InvokeOptions,
): Promise<HttpResponseInit> {
  const req = buildRequest(options);
  return await handler(req, stubContext);
}

export async function buildMultipart(
  parts: Array<{
    name: string;
    value: string | Uint8Array;
    filename?: string;
    contentType?: string;
  }>,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const fd = new FormData();
  for (const p of parts) {
    if (typeof p.value === 'string') {
      fd.append(p.name, p.value);
    } else {
      const blob = new Blob([p.value], { type: p.contentType ?? 'application/octet-stream' });
      fd.append(p.name, blob, p.filename ?? p.name);
    }
  }
  const helper = new Request('http://test/', { method: 'POST', body: fd });
  const ct = helper.headers.get('content-type') ?? 'multipart/form-data';
  const buf = new Uint8Array(await helper.arrayBuffer());
  return { bytes: buf, contentType: ct };
}
