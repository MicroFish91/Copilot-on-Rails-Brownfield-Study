import pino, { type Logger } from 'pino';
import { loadConfig } from '../services/config';

let cached: Logger | null = null;

export function getLogger(): Logger {
  if (cached) return cached;
  const cfg = loadConfig();
  cached = pino({ level: cfg.logLevel, base: undefined });
  return cached;
}

export function resetLoggerForTests(): void {
  cached = null;
}
