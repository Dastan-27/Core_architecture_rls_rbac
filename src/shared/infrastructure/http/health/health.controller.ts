import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

@ApiTags('Health - Diagnóstico del Sistema')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({
    summary: 'Health check completo',
    description:
      'Verifica la conectividad con PostgreSQL y Redis. Retorna 200 si el sistema está saludable o degradado, 503 si la base de datos no está disponible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicios saludables o degradados',
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio no disponible (BD caída)',
  })
  @Get(['health', 'api/v1/health'])
  async getHealth(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.check();

    if (result.status === 'unhealthy') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    } else {
      res.status(HttpStatus.OK);
    }

    return result;
  }

  @ApiOperation({
    summary: 'Liveness Probe (Kubernetes / Docker)',
    description: 'Comprueba únicamente que la aplicación esté ejecutándose.',
  })
  @Get('health/liveness')
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({
    summary: 'Readiness Probe (Kubernetes / Docker)',
    description:
      'Comprueba que las dependencias críticas (PostgreSQL) estén listas para recibir tráfico.',
  })
  @Get('health/readiness')
  async getReadiness(@Res({ passthrough: true }) res: Response) {
    const isDbReady = await this.healthService.checkDatabase();

    if (!isDbReady) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return {
        status: 'not_ready',
        database: 'down',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'ready',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
