/**
 * Application config — loaded once on cold start, validated, and frozen.
 * Fail-fast on missing Essential vars; Enhancement vars are optional and
 * surface as `null`.
 */

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  // Essential
  databaseUrl: string;
  storageConnectionString: string;
  photosContainerName: string;

  // Enhancement (null if not configured)
  azureOpenAi: {
    endpoint: string;
    apiKey: string;
    deployment: string;
    apiVersion: string;
  } | null;

  // Auth
  auth: {
    bcryptCost: number;
    sessionTtlSeconds: number;
  };

  // Photo upload constraints
  photo: {
    maxBytes: number;
    allowedMimeTypes: readonly string[];
  };
}

let cachedConfig: AppConfig | null = null;

function readEnv(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function readEnvOptional(name: string): string | null {
  const v = process.env[name];
  return v && v.length > 0 ? v : null;
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Environment variable ${name} must be an integer, got: ${raw}`);
  }
  return n;
}

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const nodeEnv = (readEnv('NODE_ENV', 'development') as AppConfig['nodeEnv']);
  const logLevel = (readEnv('LOG_LEVEL', 'info') as AppConfig['logLevel']);

  const databaseUrl = readEnv('DATABASE_URL');
  const storageConnectionString = readEnv('STORAGE_CONNECTION_STRING');
  const photosContainerName = readEnv('PHOTOS_CONTAINER_NAME', 'photos');

  const openAiEndpoint = readEnvOptional('AZURE_OPENAI_ENDPOINT');
  const openAiKey = readEnvOptional('AZURE_OPENAI_API_KEY');
  const openAiDeployment = readEnvOptional('AZURE_OPENAI_DEPLOYMENT');
  const openAiApiVersion = readEnvOptional('AZURE_OPENAI_API_VERSION');

  const azureOpenAi =
    openAiEndpoint && openAiKey && openAiDeployment
      ? {
          endpoint: openAiEndpoint,
          apiKey: openAiKey,
          deployment: openAiDeployment,
          apiVersion: openAiApiVersion ?? '2024-08-01-preview',
        }
      : null;

  const allowedMime = readEnv(
    'PHOTO_ALLOWED_MIME',
    'image/jpeg,image/png,image/webp,image/gif',
  )
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  cachedConfig = Object.freeze({
    nodeEnv,
    logLevel,
    databaseUrl,
    storageConnectionString,
    photosContainerName,
    azureOpenAi,
    auth: {
      bcryptCost: readInt('AUTH_BCRYPT_COST', 10),
      sessionTtlSeconds: readInt('AUTH_SESSION_TTL_SECONDS', 60 * 60 * 24 * 30),
    },
    photo: {
      maxBytes: readInt('PHOTO_MAX_BYTES', 10 * 1024 * 1024),
      allowedMimeTypes: Object.freeze(allowedMime),
    },
  }) as AppConfig;

  return cachedConfig;
}

/** Test-only — drop the cache so the next loadConfig() re-reads env. */
export function resetConfigForTests(): void {
  cachedConfig = null;
}
