import { registerAs } from '@nestjs/config';

export const REDIS_CONFIG_KEY = 'redis';

export interface RedisConfig {
  readonly url?: string;
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly db: number;
  readonly keyPrefix: string;
  readonly maxRetriesPerRequest: number;
  readonly retryDelayMs: number;
  readonly connectTimeoutMs: number;
  readonly commandTimeoutMs: number;
}

export default registerAs(REDIS_CONFIG_KEY, (): RedisConfig => ({
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? '',
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES ?? '3', 10),
  retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS ?? '200', 10),
  connectTimeoutMs: parseInt(
    process.env.REDIS_CONNECT_TIMEOUT_MS ?? '5000',
    10,
  ),
  commandTimeoutMs: parseInt(
    process.env.REDIS_COMMAND_TIMEOUT_MS ?? '5000',
    10,
  ),
}));
