import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisService } from '../../../src/shared/infrastructure/redis/redis.service.js';

// ─── Mock de ioredis ─────────────────────────────────────────────────────────

vi.mock('ioredis', () => {
  class MockRedis {
    ping = vi.fn().mockResolvedValue('PONG');
    quit = vi.fn().mockResolvedValue('OK');
    on = vi.fn();
    status = 'ready';
  }
  return { Redis: MockRedis };
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RedisService', () => {
  let service: RedisService;

  const mockConfig = {
    url: undefined,
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
    keyPrefix: '',
    maxRetriesPerRequest: 3,
    retryDelayMs: 200,
    connectTimeoutMs: 5000,
    commandTimeoutMs: 5000,
  };

  beforeEach(() => {
    service = new RedisService(mockConfig as any);
  });

  describe('getClient', () => {
    it('debe retornar una instancia del cliente Redis', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client.on).toBeDefined();
    });
  });

  describe('isHealthy', () => {
    it('debe retornar true cuando Redis responde PONG', async () => {
      const result = await service.isHealthy();
      expect(result).toBe(true);
    });

    it('debe retornar false cuando Redis falla', async () => {
      const client = service.getClient();
      (client.ping as any).mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      const result = await service.isHealthy();
      expect(result).toBe(false);
    });
  });

  describe('onApplicationShutdown', () => {
    it('debe cerrar la conexión Redis con quit()', async () => {
      const client = service.getClient();
      await service.onApplicationShutdown();
      expect(client.quit).toHaveBeenCalledOnce();
    });
  });
});
