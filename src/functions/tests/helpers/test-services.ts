import pino, { type Logger } from 'pino';
import { loadConfig, resetConfigForTests } from '../../src/services/config';
import { MemoryBlobStorageService } from '../../src/services/memory-blob-storage';
import { MemoryCaptionService } from '../../src/services/memory-caption';
import { MemoryDatabaseService } from '../../src/services/memory-database';
import {
  type AppServices,
  resetServicesForTests,
  setServicesForTests,
} from '../../src/services/registry';
import { resetLoggerForTests } from '../../src/utils/logger';

export interface MemoryServicesHandle {
  services: AppServices;
  database: MemoryDatabaseService;
  blobStorage: MemoryBlobStorageService;
  caption: MemoryCaptionService;
  logger: Logger;
}

export function useMemoryServices(
  overrides?: Partial<AppServices>,
): MemoryServicesHandle {
  resetServicesForTests();
  resetConfigForTests();
  resetLoggerForTests();

  const config = loadConfig();
  const logger = pino({ level: 'fatal' });
  const database = new MemoryDatabaseService();
  const blobStorage = new MemoryBlobStorageService();
  const caption = new MemoryCaptionService();

  const services = setServicesForTests({
    config,
    logger,
    database,
    blobStorage,
    caption,
    ...(overrides ?? {}),
  });

  return {
    services,
    database: (services.database as unknown as MemoryDatabaseService) ?? database,
    blobStorage:
      (services.blobStorage as unknown as MemoryBlobStorageService) ?? blobStorage,
    caption: (services.caption as unknown as MemoryCaptionService) ?? caption,
    logger: services.logger,
  };
}
