export interface UserSessionInvalidatorPort {
  invalidateUserSessions(userId: string): Promise<void>;
}

export const USER_SESSION_INVALIDATOR_PORT = Symbol(
  'USER_SESSION_INVALIDATOR_PORT',
);
