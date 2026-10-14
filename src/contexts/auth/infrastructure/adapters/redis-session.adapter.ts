import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { SessionCachePort } from '../../domain/ports/session-cache.port.js';

@Injectable()
export class RedisSessionAdapter implements SessionCachePort {
  private readonly redis: Redis;

  constructor(configService: ConfigService) {
    this.redis = new Redis(
      configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
    );
  }

  async saveSession(userId: string, sessionId: string, ttl: number): Promise<void> {
    await this.redis.set(`session:${userId}:${sessionId}`, 'active', 'EX', ttl);
  }

  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.redis.get(`session:${userId}:${sessionId}`);
    return session === 'active';
  }

  async invalidateSession(userId: string, sessionId: string): Promise<void> {
    await this.redis.del(`session:${userId}:${sessionId}`);
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    const keys = await this.redis.keys(`session:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
