import { Module } from '@nestjs/common';
import { TENANT_REPOSITORY_PORT } from '../domain/ports/tenant-repository.port.js';
import { PostgresTenantRepository } from './persistence/postgres-tenant.repository.js';
import {
  GetTenantUseCase,
  CreateTenantUseCase,
  UpdateTenantUseCase,
  DeactivateTenantUseCase,
} from '../application/use-cases/tenant.use-cases.js';
import { TenantsController } from './http/tenants.controller.js';

@Module({
  controllers: [TenantsController],
  providers: [
    { provide: TENANT_REPOSITORY_PORT, useClass: PostgresTenantRepository },
    GetTenantUseCase,
    CreateTenantUseCase,
    UpdateTenantUseCase,
    DeactivateTenantUseCase,
  ],
  exports: [GetTenantUseCase],
})
export class TenantModule { }
