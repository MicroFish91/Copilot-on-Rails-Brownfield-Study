import type {
  ApiErrorResponse,
  AuthSessionResponse,
  CoupleWithMembersResponse,
  CreateCoupleRequest,
  CreateCoupleResponse,
  HealthResponse,
  JoinCoupleRequest,
  JoinCoupleResponse,
  LoginRequest,
  MeResponse,
  OkResponse,
  PhotoListResponse,
  PhotoResponse,
  RegisterRequest,
  UpdateUserRequest,
  UpdateUserResponse,
} from '@duo-scrapbook/shared';

const TOKEN_KEY = 'duo-scrapbook.session-token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }
}

function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures (private mode etc.) — token is optional in URL bar dev.
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers['x-session-token'] = token;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers,
    body,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = parsed as ApiErrorResponse | null;
    const code = err?.error?.code ?? 'INTERNAL_ERROR';
    const message = err?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, code, message, err?.error?.details);
  }

  return parsed as T;
}

export const apiClient = {
  // ---- Auth -----------------------------------------------------------
  login(input: LoginRequest) {
    return request<AuthSessionResponse>('/api/auth/login', { method: 'POST', body: input });
  },
  register(input: RegisterRequest) {
    return request<AuthSessionResponse>('/api/auth/register', { method: 'POST', body: input });
  },
  logout() {
    return request<void>('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return request<MeResponse>('/api/auth/me');
  },

  // ---- Users ----------------------------------------------------------
  updateMe(input: UpdateUserRequest) {
    return request<UpdateUserResponse>('/api/users/me', { method: 'PATCH', body: input });
  },

  // ---- Couples --------------------------------------------------------
  createCouple(input: CreateCoupleRequest) {
    return request<CreateCoupleResponse>('/api/couples', { method: 'POST', body: input });
  },
  joinCouple(input: JoinCoupleRequest) {
    return request<JoinCoupleResponse>('/api/couples/join', { method: 'POST', body: input });
  },
  myCouple() {
    return request<CoupleWithMembersResponse>('/api/couples/me');
  },
  leaveCouple() {
    return request<void>('/api/couples/me/leave', { method: 'DELETE' });
  },

  // ---- Photos ---------------------------------------------------------
  listPhotos(query?: { cursor?: string; limit?: number }) {
    return request<PhotoListResponse>('/api/photos', { query });
  },
  getPhoto(id: string) {
    return request<PhotoResponse>(`/api/photos/${encodeURIComponent(id)}`);
  },
  uploadPhoto(file: File, takenAt?: string) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    if (takenAt) fd.append('takenAt', takenAt);
    return request<PhotoResponse>('/api/photos', { method: 'POST', formData: fd });
  },
  deletePhoto(id: string) {
    return request<void>(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  regenerateCaption(id: string) {
    return request<PhotoResponse>(
      `/api/photos/${encodeURIComponent(id)}/regenerate-caption`,
      { method: 'POST' },
    );
  },

  // ---- Health / OpenAPI ----------------------------------------------
  health() {
    return request<HealthResponse>('/api/health');
  },

  ok(): OkResponse {
    return { ok: true };
  },
};
