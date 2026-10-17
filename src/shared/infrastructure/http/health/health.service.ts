import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../persistence/database.service.js';
import { RedisService } from '../../redis/redis.service.js';

export type ServiceStatus = 'up' | 'down';
export type OverallHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: OverallHealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [dbUp, redisUp] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    let status: OverallHealthStatus = 'healthy';
    if (!dbUp && !redisUp) {
      status = 'unhealthy';
    } else if (!dbUp) {
      status = 'unhealthy'; // La base de datos es crítica
    } else if (!redisUp) {
      status = 'degraded'; // Redis caído degrada cache/sesiones
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: dbUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
      },
    };
  }

  async checkDatabase(): Promise<boolean> {
    try {
      return await this.databaseService.verifyConnection();
    } catch (error) {
      this.logger.warn(
        `Health check: Fallo en base de datos - ${(error as Error).message}`,
      );
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    try {
      return await this.redisService.isHealthy();
    } catch (error) {
      this.logger.warn(
        `Health check: Fallo en Redis - ${(error as Error).message}`,
      );
      return false;
    }
  }
}
