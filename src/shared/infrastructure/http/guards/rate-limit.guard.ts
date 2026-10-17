import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.service.js';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from '../decorators/rate-limit.decorator.js';
import { RateLimitExceededException } from '../exceptions/rate-limit.exception.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const ip = this.extractClientIp(req);
    const identifier = this.buildIdentifier(req, ip, options);
    const routeIdentifier = `${req.method}:${req.baseUrl || ''}${req.path || ''}`;
    const key = `${options.keyPrefix ?? 'rl'}:${routeIdentifier}:${identifier}`;

    const SCRIPT = `
      local current = redis.call('INCR', KEYS[1])
      local ttl = redis.call('TTL', KEYS[1])
      if ttl == -1 or current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
        ttl = tonumber(ARGV[1])
      end
      return {current, ttl}
    `;

    try {
      const results = (await this.redis.eval(
        SCRIPT,
        1,
        key,
        options.ttlSeconds.toString(),
      )) as [number, number];

      if (!results || results.length < 2) {
        return true;
      }

      const currentCount = Number(results[0]);
      const currentTtl = Number(results[1]);

      const remaining = Math.max(0, options.limit - currentCount);
      const ttl = currentTtl > 0 ? currentTtl : options.ttlSeconds;

      res.setHeader('X-RateLimit-Limit', options.limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader(
        'X-RateLimit-Reset',
        (Math.floor(Date.now() / 1000) + ttl).toString(),
      );

      if (currentCount > options.limit) {
        res.setHeader('Retry-After', ttl.toString());
        throw new RateLimitExceededException(ttl);
      }

      return true;
    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        throw error;
      }
      this.logger.error(
        `Error al ejecutar RateLimitGuard contra Redis (fail-open aplicado): ${(error as Error).message}`,
        (error as Error).stack,
      );
      return true; // Fail-open para preservar disponibilidad
    }
  }

  private extractClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      const [firstIp] = forwardedFor.split(',');
      return firstIp.trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1';
  }

  private buildIdentifier(
    req: Request,
    ip: string,
    options: RateLimitOptions,
  ): string {
    if (options.trackByBodyField && req.body && typeof req.body === 'object') {
      const fieldValue = (req.body as Record<string, unknown>)[
        options.trackByBodyField
      ];
      if (typeof fieldValue === 'string' && fieldValue.length > 0) {
        const cleanField = fieldValue.toLowerCase().trim();
        return `${ip}:${cleanField}`;
      }
    }
    return ip;
  }
}
