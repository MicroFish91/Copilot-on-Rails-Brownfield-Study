import type { Logger } from 'pino';
import { type AppConfig, loadConfig } from './config';
import type { IBlobStorageService } from './interfaces/IBlobStorageService';
import type { ICaptionService } from './interfaces/ICaptionService';
import type { IDatabaseService } from './interfaces/IDatabaseService';
import { AzureBlobStorageService } from './azure-blob-storage';
import { MemoryCaptionService } from './memory-caption';
import { OpenAICaptionService } from './openai-caption';
import { PostgresDatabaseService } from './postgres-database';
import { getLogger } from '../utils/logger';

export interface AppServices {
  config: AppConfig;
  database: IDatabaseService;
  blobStorage: IBlobStorageService;
  caption: ICaptionService;
  logger: Logger;
}

let cached: AppServices | null = null;

export function initializeServices(): AppServices {
  const config = loadConfig();
  const logger = getLogger();
  const database = new PostgresDatabaseService({
    connectionString: config.databaseUrl,
  });
  const blobStorage = new AzureBlobStorageService({
    connectionString: config.storageConnectionString,
    containerName: config.photosContainerName,
  });
  let caption: ICaptionService;
  try {
    caption = new OpenAICaptionService(config.azureOpenAi, logger);
  } catch (err) {
    logger.warn({ err }, 'Falling back to MemoryCaptionService');
    caption = new MemoryCaptionService();
  }
  cached = { config, database, blobStorage, caption, logger };
  return cached;
}

export function getServices(): AppServices {
  if (!cached) cached = initializeServices();
  return cached;
}

export function setServicesForTests(overrides: Partial<AppServices>): AppServices {
  const base = cached ?? {
    config: loadConfig(),
    database: undefined as unknown as IDatabaseService,
    blobStorage: undefined as unknown as IBlobStorageService,
    caption: new MemoryCaptionService(),
    logger: getLogger(),
  };
  cached = { ...base, ...overrides } as AppServices;
  return cached;
}

export function resetServicesForTests(): void {
  cached = null;
}
