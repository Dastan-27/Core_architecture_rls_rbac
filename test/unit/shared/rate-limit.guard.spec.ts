import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '../../../src/shared/infrastructure/http/guards/rate-limit.guard.js';
import { RateLimitExceededException } from '../../../src/shared/infrastructure/http/exceptions/rate-limit.exception.js';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let mockPipeline: {
    incr: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  };
  let mockRedis: {
    pipeline: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };
  let mockRequest: any;
  let mockResponse: {
    setHeader: ReturnType<typeof vi.fn>;
  };
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockPipeline = {
      incr: vi.fn().mockReturnThis(),
      ttl: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 1], // currentCount
        [null, 60], // currentTtl
      ]),
    };

    mockRedis = {
      pipeline: vi.fn(() => mockPipeline),
      expire: vi.fn().mockResolvedValue(1),
    };

    reflector = new Reflector();
    guard = new RateLimitGuard(reflector, mockRedis as any);

    mockResponse = {
      setHeader: vi.fn(),
    };

    mockRequest = {
      method: 'POST',
      baseUrl: '/api/v1',
      path: '/auth/login',
      ip: '192.168.1.100',
      headers: {},
      body: { email: 'test@example.com' },
      socket: { remoteAddress: '192.168.1.100' },
    };

    mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;
  });

  it('debe permitir la solicitud si no hay metadata de rate limit', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockRedis.pipeline).not.toHaveBeenCalled();
  });

  it('debe permitir la solicitud cuando el contador está dentro del límite y setear headers', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
      trackByBodyField: 'email',
    });

    mockPipeline.exec.mockResolvedValue([
      [null, 3], // 3ra petición de 5
      [null, 45], // 45 segundos restantes
    ]);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockPipeline.incr).toHaveBeenCalledWith(
      'rl:POST:/api/v1/auth/login:192.168.1.100:test@example.com',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Limit',
      '5',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Remaining',
      '2',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Reset',
      expect.any(String),
    );
  });

  it('debe configurar expire si es la primera solicitud (count === 1)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
    });

    mockPipeline.exec.mockResolvedValue([
      [null, 1],
      [null, -1],
    ]);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockRedis.expire).toHaveBeenCalledWith(
      'rl:POST:/api/v1/auth/login:192.168.1.100',
      60,
    );
  });

  it('debe bloquear la solicitud y lanzar RateLimitExceededException si supera el límite', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
    });

    mockPipeline.exec.mockResolvedValue([
      [null, 6], // Excede límite de 5
      [null, 30],
    ]);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      RateLimitExceededException,
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Remaining',
      '0',
    );
  });

  it('debe aplicar fail-open si Redis falla para no tirar abajo la aplicación', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
    });

    mockPipeline.exec.mockRejectedValue(new Error('Redis connection refused'));

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('debe usar IP de x-forwarded-for si está detrás de un reverse proxy', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
    });

    mockRequest.headers['x-forwarded-for'] = '203.0.113.195, 70.41.3.18';

    await guard.canActivate(mockContext);

    expect(mockPipeline.incr).toHaveBeenCalledWith(
      'rl:POST:/api/v1/auth/login:203.0.113.195',
    );
  });
});
