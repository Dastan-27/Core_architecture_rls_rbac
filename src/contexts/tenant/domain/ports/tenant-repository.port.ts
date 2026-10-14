import type { Tenant } from '../models/tenant.entity.js';

export interface CreateTenantData {
  readonly nitRut: string;
  readonly businessName: string;
  readonly tradeName: string;
  readonly address: string;
  readonly phone: string;
  readonly email: string;
  readonly countryCode?: string;
  readonly currencyCode?: string;
  readonly taxRegime?: string;
}

export interface UpdateTenantData {
  readonly address?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly tradeName?: string;
  readonly countryCode?: string;
  readonly currencyCode?: string;
  readonly taxRegime?: string;
}

export interface DeactivateTenantResult {
  readonly id: string;
  readonly businessName: string;
  readonly isActive: boolean;
}

export interface TenantRepositoryPort {
  findById(id: string): Promise<Tenant | null>;
  findByNitRut(nitRut: string): Promise<Tenant | null>;
  create(data: CreateTenantData): Promise<Tenant>;
  update(id: string, data: UpdateTenantData): Promise<Tenant | null>;
  softDelete(id: string): Promise<DeactivateTenantResult | null>;
}

export const TENANT_REPOSITORY_PORT = Symbol('TENANT_REPOSITORY_PORT');
