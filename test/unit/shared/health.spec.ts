import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../../../src/shared/infrastructure/http/health/health.service.js';
import { HealthController } from '../../../src/shared/infrastructure/http/health/health.controller.js';
import type { DatabaseService } from '../../../src/shared/infrastructure/persistence/database.service.js';
import type { RedisService } from '../../../src/shared/infrastructure/redis/redis.service.js';
import type { Response } from 'express';

describe('HealthCheck System', () => {
  let healthService: HealthService;
  let healthController: HealthController;
  let mockDbService: { verifyConnection: ReturnType<typeof vi.fn> };
  let mockRedisService: { isHealthy: ReturnType<typeof vi.fn> };
  let mockResponse: { status: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDbService = {
      verifyConnection: vi.fn(),
    };
    mockRedisService = {
      isHealthy: vi.fn(),
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
    };

    healthService = new HealthService(
      mockDbService as unknown as DatabaseService,
      mockRedisService as unknown as RedisService,
    );
    healthController = new HealthController(healthService);
  });

  describe('HealthService', () => {
    it('debe retornar status "healthy" cuando DB y Redis responden correctamente', async () => {
      mockDbService.verifyConnection.mockResolvedValue(true);
      mockRedisService.isHealthy.mockResolvedValue(true);

      const result = await healthService.check();

      expect(result.status).toBe('healthy');
      expect(result.services.database).toBe('up');
      expect(result.services.redis).toBe('up');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });

    it('debe retornar status "degraded" cuando Redis cae pero DB funciona', async () => {
      mockDbService.verifyConnection.mockResolvedValue(true);
      mockRedisService.isHealthy.mockResolvedValue(false);

      const result = await healthService.check();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('up');
      expect(result.services.redis).toBe('down');
    });

    it('debe retornar status "unhealthy" cuando la base de datos falla', async () => {
      mockDbService.verifyConnection.mockRejectedValue(
        new Error('Connection lost'),
      );
      mockRedisService.isHealthy.mockResolvedValue(true);

      const result = await healthService.check();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('down');
      expect(result.services.redis).toBe('up');
    });

    it('debe retornar status "unhealthy" cuando ambos servicios fallan', async () => {
      mockDbService.verifyConnection.mockRejectedValue(new Error('DB down'));
      mockRedisService.isHealthy.mockResolvedValue(false);

      const result = await healthService.check();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('down');
      expect(result.services.redis).toBe('down');
    });
  });

  describe('HealthController', () => {
    it('debe responder con HTTP 200 cuando el status es healthy', async () => {
      mockDbService.verifyConnection.mockResolvedValue(true);
      mockRedisService.isHealthy.mockResolvedValue(true);

      const res = await healthController.getHealth(
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(res.status).toBe('healthy');
    });

    it('debe responder con HTTP 200 cuando el status es degraded', async () => {
      mockDbService.verifyConnection.mockResolvedValue(true);
      mockRedisService.isHealthy.mockResolvedValue(false);

      const res = await healthController.getHealth(
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(res.status).toBe('degraded');
    });

    it('debe responder con HTTP 503 cuando el status es unhealthy', async () => {
      mockDbService.verifyConnection.mockResolvedValue(false);
      mockRedisService.isHealthy.mockResolvedValue(true);

      const res = await healthController.getHealth(
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(res.status).toBe('unhealthy');
    });

    it('debe responder ok en liveness probe', () => {
      const res = healthController.getLiveness();
      expect(res.status).toBe('ok');
      expect(res.timestamp).toBeDefined();
    });

    it('debe responder ready en readiness probe cuando DB está lista', async () => {
      mockDbService.verifyConnection.mockResolvedValue(true);

      const res = await healthController.getReadiness(
        mockResponse as unknown as Response,
      );
      expect(res.status).toBe('ready');
      expect(res.database).toBe('up');
    });

    it('debe responder 503 en readiness probe si DB no está lista', async () => {
      mockDbService.verifyConnection.mockResolvedValue(false);

      const res = await healthController.getReadiness(
        mockResponse as unknown as Response,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(res.status).toBe('not_ready');
    });
  });
});
