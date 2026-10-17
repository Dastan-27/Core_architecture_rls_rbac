import { Module } from '@nestjs/common';
import { TENANT_REPOSITORY_PORT } from '../domain/ports/tenant-repository.port.js';
import { TENANT_CACHE_PORT } from '../domain/ports/tenant-cache.port.js';
import { TENANT_SESSION_INVALIDATOR_PORT } from '../domain/ports/tenant-session-invalidator.port.js';
import { PostgresTenantRepository } from './persistence/postgres-tenant.repository.js';
import { RedisTenantCacheAdapter } from './adapters/redis-tenant-cache.adapter.js';
import { RedisTenantSessionAdapter } from './adapters/redis-tenant-session.adapter.js';
import {
  GetTenantUseCase,
  CreateTenantUseCase,
  UpdateTenantUseCase,
  DeactivateTenantUseCase,
} from '../application/use-cases/tenant.use-cases.js';
import { TenantsController } from './http/tenants.controller.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { RbacModule } from '../../rbac/infrastructure/rbac.module.js';
import { RedisModule } from '../../../shared/infrastructure/redis/redis.module.js';

@Module({
  imports: [AuthModule, RbacModule, RedisModule],
  controllers: [TenantsController],
  providers: [
    { provide: TENANT_REPOSITORY_PORT, useClass: PostgresTenantRepository },
    { provide: TENANT_CACHE_PORT, useClass: RedisTenantCacheAdapter },
    {
      provide: TENANT_SESSION_INVALIDATOR_PORT,
      useClass: RedisTenantSessionAdapter,
    },
    GetTenantUseCase,
    CreateTenantUseCase,
    UpdateTenantUseCase,
    DeactivateTenantUseCase,
  ],
  exports: [GetTenantUseCase, TENANT_CACHE_PORT],
})
export class TenantModule {}
