import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisSessionAdapter } from '../../../../src/contexts/auth/infrastructure/adapters/redis-session.adapter.js';

// ─── Mock de ioredis ─────────────────────────────────────────────────────────

function createMockPipeline() {
  const pipeline: Record<string, ReturnType<typeof vi.fn>> = {
    set: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    srem: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
  return pipeline;
}

function createMockRedis() {
  const mockPipeline = createMockPipeline();
  return {
    client: {
      get: vi.fn(),
      smembers: vi.fn(),
      pipeline: vi.fn(() => mockPipeline),
    },
    pipeline: mockPipeline,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RedisSessionAdapter', () => {
  let adapter: RedisSessionAdapter;
  let mock: ReturnType<typeof createMockRedis>;

  const userId = 'user-123';
  const sessionId = 'session-abc';
  const ttl = 28800;

  beforeEach(() => {
    mock = createMockRedis();
    adapter = new RedisSessionAdapter(mock.client as any);
  });

  // ─── saveSession ───────────────────────────────────────────────────

  describe('saveSession', () => {
    it('debe guardar la sesión y agregar el sessionId al índice del usuario via pipeline', async () => {
      await adapter.saveSession(userId, sessionId, ttl);

      expect(mock.client.pipeline).toHaveBeenCalledOnce();
      expect(mock.pipeline.set).toHaveBeenCalledWith(
        `session:${userId}:${sessionId}`,
        'active',
        'EX',
        ttl,
      );
      expect(mock.pipeline.sadd).toHaveBeenCalledWith(
        `user:${userId}:sessions`,
        sessionId,
      );
      expect(mock.pipeline.expire).toHaveBeenCalledWith(
        `user:${userId}:sessions`,
        ttl + 60,
      );
      expect(mock.pipeline.exec).toHaveBeenCalledOnce();
    });
  });

  // ─── isSessionActive ──────────────────────────────────────────────

  describe('isSessionActive', () => {
    it('debe retornar true cuando la sesión está activa', async () => {
      mock.client.get.mockResolvedValue('active');

      const result = await adapter.isSessionActive(userId, sessionId);

      expect(result).toBe(true);
      expect(mock.client.get).toHaveBeenCalledWith(
        `session:${userId}:${sessionId}`,
      );
    });

    it('debe retornar false cuando la sesión no existe', async () => {
      mock.client.get.mockResolvedValue(null);

      const result = await adapter.isSessionActive(userId, sessionId);

      expect(result).toBe(false);
    });

    it('debe retornar false cuando la sesión tiene un valor distinto de "active"', async () => {
      mock.client.get.mockResolvedValue('expired');

      const result = await adapter.isSessionActive(userId, sessionId);

      expect(result).toBe(false);
    });
  });

  // ─── invalidateSession ────────────────────────────────────────────

  describe('invalidateSession', () => {
    it('debe eliminar la clave de sesión y removerla del índice via pipeline', async () => {
      await adapter.invalidateSession(userId, sessionId);

      expect(mock.client.pipeline).toHaveBeenCalledOnce();
      expect(mock.pipeline.del).toHaveBeenCalledWith(
        `session:${userId}:${sessionId}`,
      );
      expect(mock.pipeline.srem).toHaveBeenCalledWith(
        `user:${userId}:sessions`,
        sessionId,
      );
      expect(mock.pipeline.exec).toHaveBeenCalledOnce();
    });
  });

  // ─── invalidateUserSessions ───────────────────────────────────────

  describe('invalidateUserSessions', () => {
    it('debe eliminar todas las sesiones del usuario y el índice via pipeline', async () => {
      const sessionIds = ['sess-1', 'sess-2', 'sess-3'];
      mock.client.smembers.mockResolvedValue(sessionIds);

      await adapter.invalidateUserSessions(userId);

      expect(mock.client.smembers).toHaveBeenCalledWith(
        `user:${userId}:sessions`,
      );
      expect(mock.client.pipeline).toHaveBeenCalledOnce();

      // Debe borrar cada clave de sesión individual
      for (const sid of sessionIds) {
        expect(mock.pipeline.del).toHaveBeenCalledWith(
          `session:${userId}:${sid}`,
        );
      }
      // Debe borrar el índice del Set
      expect(mock.pipeline.del).toHaveBeenCalledWith(`user:${userId}:sessions`);
      expect(mock.pipeline.exec).toHaveBeenCalledOnce();
    });

    it('no debe ejecutar pipeline si no hay sesiones activas', async () => {
      mock.client.smembers.mockResolvedValue([]);

      await adapter.invalidateUserSessions(userId);

      expect(mock.client.smembers).toHaveBeenCalledWith(
        `user:${userId}:sessions`,
      );
      expect(
        mock.pipeline.pipeline ?? mock.client.pipeline,
      ).not.toHaveBeenCalled();
    });
  });

  // ─── Resiliencia y manejo de errores ──────────────────────────────

  describe('Resiliencia y excepciones controladas', () => {
    it('debe lanzar SessionCacheUnavailableException si Redis falla en saveSession', async () => {
      mock.pipeline.exec.mockRejectedValue(new Error('Connection lost'));

      await expect(adapter.saveSession(userId, sessionId, ttl)).rejects.toThrow(
        'El servicio de sesiones no está disponible temporalmente',
      );
    });

    it('debe lanzar SessionCacheUnavailableException si Redis falla en isSessionActive', async () => {
      mock.client.get.mockRejectedValue(new Error('Connection timeout'));

      await expect(adapter.isSessionActive(userId, sessionId)).rejects.toThrow(
        'El servicio de sesiones no está disponible temporalmente',
      );
    });

    it('debe lanzar SessionCacheUnavailableException si Redis falla en invalidateSession', async () => {
      mock.pipeline.exec.mockRejectedValue(new Error('Redis crash'));

      await expect(
        adapter.invalidateSession(userId, sessionId),
      ).rejects.toThrow(
        'El servicio de sesiones no está disponible temporalmente',
      );
    });

    it('debe lanzar SessionCacheUnavailableException si Redis falla en invalidateUserSessions', async () => {
      mock.client.smembers.mockRejectedValue(new Error('Network partition'));

      await expect(adapter.invalidateUserSessions(userId)).rejects.toThrow(
        'El servicio de sesiones no está disponible temporalmente',
      );
    });
  });
});
