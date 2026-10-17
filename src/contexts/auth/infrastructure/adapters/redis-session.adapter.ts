import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { SessionCachePort } from '../../domain/ports/session-cache.port.js';
import { REDIS_CLIENT } from '../../../../shared/infrastructure/redis/redis.service.js';
import { SessionCacheUnavailableException } from '../../domain/exceptions/auth.exceptions.js';

/**
 * Adaptador Redis para gestión de sesiones activas.
 *
 * Estrategia de almacenamiento:
 *  - Cada sesión individual:   session:{userId}:{sessionId}  → 'active'  (TTL)
 *  - Índice de sesiones/user:  user:{userId}:sessions        → Set de sessionIds
 *
 * Esto permite invalidar todas las sesiones de un usuario sin usar
 * el comando bloqueante KEYS (anti-patrón en producción).
 * Se usa pipeline para operaciones atómicas en batch.
 */
@Injectable()
export class RedisSessionAdapter implements SessionCachePort {
  private readonly logger = new Logger(RedisSessionAdapter.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async saveSession(
    userId: string,
    sessionId: string,
    ttl: number,
  ): Promise<void> {
    try {
      const sessionKey = this.sessionKey(userId, sessionId);
      const indexKey = this.userSessionsKey(userId);

      const pipeline = this.redis.pipeline();
      pipeline.set(sessionKey, 'active', 'EX', ttl);
      pipeline.sadd(indexKey, sessionId);
      // El índice expira un poco después que la sesión más larga posible
      pipeline.expire(indexKey, ttl + 60);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `Error al guardar sesión en Redis para usuario ${userId}`,
        (error as Error).stack,
      );
      throw new SessionCacheUnavailableException();
    }
  }

  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    try {
      const session = await this.redis.get(this.sessionKey(userId, sessionId));
      return session === 'active';
    } catch (error) {
      this.logger.error(
        `Error al verificar sesión en Redis para usuario ${userId}`,
        (error as Error).stack,
      );
      throw new SessionCacheUnavailableException();
    }
  }

  async invalidateSession(userId: string, sessionId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.del(this.sessionKey(userId, sessionId));
      pipeline.srem(this.userSessionsKey(userId), sessionId);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `Error al invalidar sesión en Redis para usuario ${userId}`,
        (error as Error).stack,
      );
      throw new SessionCacheUnavailableException();
    }
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      const indexKey = this.userSessionsKey(userId);
      const sessionIds = await this.redis.smembers(indexKey);

      if (sessionIds.length === 0) {
        return;
      }

      const pipeline = this.redis.pipeline();
      for (const sessionId of sessionIds) {
        pipeline.del(this.sessionKey(userId, sessionId));
      }
      pipeline.del(indexKey);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `Error al invalidar todas las sesiones de Redis para usuario ${userId}`,
        (error as Error).stack,
      );
      throw new SessionCacheUnavailableException();
    }
  }

  // ─── Key builders ─────────────────────────────────────────────────

  private sessionKey(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }

  private userSessionsKey(userId: string): string {
    return `user:${userId}:sessions`;
  }
}
