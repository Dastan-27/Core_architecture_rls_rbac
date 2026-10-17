import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared/infrastructure/redis/redis.service.js';
import type { TenantCachePort } from '../../domain/ports/tenant-cache.port.js';
import { Tenant } from '../../domain/models/tenant.entity.js';

@Injectable()
export class RedisTenantCacheAdapter implements TenantCachePort {
  private readonly logger = new Logger(RedisTenantCacheAdapter.name);
  private readonly TTL_SECONDS = 3600; // 1 hora de caché por defecto

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async get(tenantId: string): Promise<Tenant | null> {
    try {
      const data = await this.redis.get(this.cacheKey(tenantId));
      if (!data) {
        return null;
      }
      const parsed = JSON.parse(data);
      return new Tenant(
        parsed.id,
        parsed.nitRut,
        parsed.businessName,
        parsed.tradeName,
        parsed.address,
        parsed.phone,
        parsed.email,
        parsed.countryCode,
        parsed.currencyCode,
        parsed.isActive,
        new Date(parsed.createdAt),
      );
    } catch (error) {
      this.logger.warn(
        `Fallo al leer caché de tenant ${tenantId} desde Redis (fail-open aplicado): ${(error as Error).message}`,
      );
      return null;
    }
  }

  async set(
    tenantId: string,
    tenant: Tenant,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const ttl = ttlSeconds ?? this.TTL_SECONDS;
      const key = this.cacheKey(tenantId);
      await this.redis.set(key, JSON.stringify(tenant), 'EX', ttl);
    } catch (error) {
      this.logger.warn(
        `Fallo al guardar caché de tenant ${tenantId} en Redis: ${(error as Error).message}`,
      );
    }
  }

  async invalidate(tenantId: string): Promise<void> {
    try {
      await this.redis.del(this.cacheKey(tenantId));
    } catch (error) {
      this.logger.warn(
        `Fallo al invalidar caché de tenant ${tenantId} en Redis: ${(error as Error).message}`,
      );
    }
  }

  private cacheKey(tenantId: string): string {
    return `cache:tenant:${tenantId}`;
  }
}
