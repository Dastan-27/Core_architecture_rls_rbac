import { Inject, Injectable } from '@nestjs/common';
import { TENANT_REPOSITORY_PORT } from '../../domain/ports/tenant-repository.port.js';
import type {
  TenantRepositoryPort,
  CreateTenantData,
  UpdateTenantData,
  DeactivateTenantResult,
} from '../../domain/ports/tenant-repository.port.js';
import type { Tenant } from '../../domain/models/tenant.entity.js';
import {
  TenantNotFoundException,
  TenantAlreadyExistsException,
} from '../../domain/exceptions/tenant.exceptions.js';

@Injectable()
export class GetTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_PORT)
    private readonly tenantRepository: TenantRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new TenantNotFoundException(tenantId);
    }
    return tenant;
  }
}

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_PORT)
    private readonly tenantRepository: TenantRepositoryPort,
  ) {}

  async execute(data: CreateTenantData): Promise<Tenant> {
    const existing = await this.tenantRepository.findByNitRut(data.nitRut);
    if (existing) {
      throw new TenantAlreadyExistsException(data.nitRut);
    }
    return this.tenantRepository.create(data);
  }
}

@Injectable()
export class UpdateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_PORT)
    private readonly tenantRepository: TenantRepositoryPort,
  ) {}

  async execute(tenantId: string, data: UpdateTenantData): Promise<Tenant> {
    const updated = await this.tenantRepository.update(tenantId, data);
    if (!updated) {
      throw new TenantNotFoundException(tenantId);
    }
    return updated;
  }
}

@Injectable()
export class DeactivateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_PORT)
    private readonly tenantRepository: TenantRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<DeactivateTenantResult> {
    const result = await this.tenantRepository.softDelete(tenantId);
    if (!result) {
      throw new TenantNotFoundException(tenantId);
    }
    return result;
  }
}
