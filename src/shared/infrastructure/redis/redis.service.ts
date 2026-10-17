import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Redis } from 'ioredis';

import redisConfig from '../config/redis.config.js';

/**
 * Token de inyección para el cliente Redis singleton.
 * Usar con @Inject(REDIS_CLIENT) en cualquier adapter o servicio.
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Servicio wrapper que gestiona el ciclo de vida de la conexión Redis.
 * - Conexión con retry strategy configurable
 * - Logging de eventos de conexión
 * - Graceful shutdown con quit()
 * - Health check (ping)
 */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>,
  ) {
    this.client = this.createClient();
    this.registerEventListeners();
  }

  /**
   * Devuelve la instancia singleton del cliente ioredis.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Health check — devuelve true si Redis responde PONG.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Cierra la conexión limpiamente al apagar la aplicación.
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Cerrando conexión Redis...');
    try {
      await this.client.quit();
      this.logger.log('Conexión Redis cerrada correctamente');
    } catch (error) {
      this.logger.error(
        'Error al cerrar la conexión Redis',
        (error as Error).stack,
      );
    }
  }

  // ─── Internals ──────────────────────────────────────────────────────

  private createClient(): Redis {
    const {
      url,
      host,
      port,
      password,
      db,
      keyPrefix,
      maxRetriesPerRequest,
      retryDelayMs,
      connectTimeoutMs,
      commandTimeoutMs,
    } = this.config;

    const commonOptions = {
      db,
      keyPrefix: keyPrefix || undefined,
      maxRetriesPerRequest,
      connectTimeout: connectTimeoutMs,
      commandTimeout: commandTimeoutMs,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error(
            `Redis: se alcanzó el máximo de reintentos (${times}). Deteniendo reconexión.`,
          );
          return null; // Stop retrying
        }
        const delay = Math.min(times * retryDelayMs, 5000);
        this.logger.warn(
          `Redis: reintento de conexión #${times} en ${delay}ms`,
        );
        return delay;
      },
      lazyConnect: false,
      enableReadyCheck: true,
    };

    if (url) {
      return new Redis(url, {
        ...commonOptions,
      });
    }

    return new Redis({
      host,
      port,
      password: password || undefined,
      ...commonOptions,
    });
  }

  private registerEventListeners(): void {
    this.client.on('connect', () => {
      this.logger.log('Redis: conexión TCP establecida');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis: cliente listo para recibir comandos');
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis: error — ${error.message}`, error.stack);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis: conexión cerrada');
    });

    this.client.on('reconnecting', (delayMs: number) => {
      this.logger.warn(`Redis: reconectando en ${delayMs}ms`);
    });
  }
}
