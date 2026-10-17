import type { Tenant } from '../models/tenant.entity.js';

export interface TenantCachePort {
  get(tenantId: string): Promise<Tenant | null>;
  set(tenantId: string, tenant: Tenant, ttlSeconds?: number): Promise<void>;
  invalidate(tenantId: string): Promise<void>;
}

export const TENANT_CACHE_PORT = Symbol('TENANT_CACHE_PORT');
