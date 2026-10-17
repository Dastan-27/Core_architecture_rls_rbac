import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import redisConfig from '../config/redis.config.js';
import { RedisService, REDIS_CLIENT } from './redis.service.js';

/**
 * Módulo global que provee la conexión Redis como singleton.
 *
 * Exporta:
 *  - REDIS_CLIENT (Symbol) → instancia de ioredis.Redis
 *  - RedisService → wrapper con health check y lifecycle
 *
 * Cualquier módulo puede inyectar directamente:
 *   @Inject(REDIS_CLIENT) private readonly redis: Redis
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [
    RedisService,
    {
      provide: REDIS_CLIENT,
      useFactory: (redisService: RedisService) => redisService.getClient(),
      inject: [RedisService],
    },
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
