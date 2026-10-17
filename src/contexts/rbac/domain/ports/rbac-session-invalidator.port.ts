export interface RbacSessionInvalidatorPort {
  invalidateUserSessions(userId: string): Promise<void>;
}

export const RBAC_SESSION_INVALIDATOR_PORT = Symbol(
  'RBAC_SESSION_INVALIDATOR_PORT',
);
