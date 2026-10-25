import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type {
  PasswordResetTokenData,
  PasswordResetTokenPort,
} from '../../domain/ports/password-reset-token.port.js';
import { REDIS_CLIENT } from '../../../../shared/infrastructure/redis/redis.service.js';
import { SessionCacheUnavailableException } from '../../domain/exceptions/auth.exceptions.js';

@Injectable()
export class RedisPasswordResetTokenAdapter implements PasswordResetTokenPort {
  private readonly logger = new Logger(RedisPasswordResetTokenAdapter.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  private tokenKey(token: string): string {
    return `pwd_reset:${token}`;
  }

  async saveResetToken(
    token: string,
    data: PasswordResetTokenData,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.set(
        this.tokenKey(token),
        JSON.stringify(data),
        'EX',
        ttlSeconds,
      );
    } catch (error) {
      this.logger.error(
        `Error al guardar token de reseteo en Redis`,
        (error as Error).stack,
      );
      throw new SessionCacheUnavailableException(
        'No se pudo generar el token de recuperación',
      );
    }
  }

  async getResetToken(token: string): Promise<PasswordResetTokenData | null> {
    try {
      const raw = await this.redis.get(this.tokenKey(token));
      if (!raw) return null;
      return JSON.parse(raw) as PasswordResetTokenData;
    } catch (error) {
      this.logger.error(
        `Error al obtener token de reseteo en Redis`,
        (error as Error).stack,
      );
      return null;
    }
  }

  async consumeResetToken(
    token: string,
  ): Promise<PasswordResetTokenData | null> {
    try {
      const key = this.tokenKey(token);
      const raw = await this.redis.get(key);
      if (!raw) return null;
      await this.redis.del(key);
      return JSON.parse(raw) as PasswordResetTokenData;
    } catch (error) {
      this.logger.error(
        `Error al consumir token de reseteo en Redis`,
        (error as Error).stack,
      );
      return null;
    }
  }
}
