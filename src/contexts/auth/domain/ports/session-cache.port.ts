export interface SessionCachePort {
  saveSession(userId: string, sessionId: string, ttl: number): Promise<void>;
  isSessionActive(userId: string, sessionId: string): Promise<boolean>;
  invalidateSession(userId: string, sessionId: string): Promise<void>;
  invalidateUserSessions(userId: string): Promise<void>;
}

export const SESSION_CACHE_PORT = Symbol('SESSION_CACHE_PORT');
