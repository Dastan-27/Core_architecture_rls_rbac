export interface TenantSessionInvalidatorPort {
  invalidateTenantSessions(tenantId: string): Promise<void>;
}

export const TENANT_SESSION_INVALIDATOR_PORT = Symbol(
  'TENANT_SESSION_INVALIDATOR_PORT',
);
