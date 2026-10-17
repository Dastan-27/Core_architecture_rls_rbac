import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TOKEN_SERVICE_PORT } from '../domain/ports/token-service.port.js';
import { PASSWORD_HASHER_PORT } from '../domain/ports/password-hasher.port.js';
import { SESSION_CACHE_PORT } from '../domain/ports/session-cache.port.js';
import { USER_REPOSITORY_PORT } from '../../user/domain/ports/user-repository.port.js';
import { TENANT_REPOSITORY_PORT } from '../../tenant/domain/ports/tenant-repository.port.js';

import { JwtTokenAdapter } from './adapters/jwt-token.adapter.js';
import { BcryptHasherAdapter } from './adapters/bcrypt-hasher.adapter.js';
import { RedisSessionAdapter } from './adapters/redis-session.adapter.js';
import { PostgresUserRepository } from '../../user/infrastructure/persistence/postgres-user.repository.js';
import { PostgresTenantRepository } from '../../tenant/infrastructure/persistence/postgres-tenant.repository.js';

import { LoginUseCase } from '../application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case.js';
import { GetProfileUseCase } from '../application/use-cases/get-profile.use-case.js';
import { LogoutUseCase } from '../application/use-cases/logout.use-case.js';

import { JwtAuthGuard } from './http/guards/jwt-auth.guard.js';
import { RateLimitGuard } from '../../../shared/infrastructure/http/guards/rate-limit.guard.js';
import { AuthController } from './http/auth.controller.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            config.get<string>('JWT_EXPIRATION') ??
            '1h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Ports → Adapters
    { provide: TOKEN_SERVICE_PORT, useClass: JwtTokenAdapter },
    { provide: PASSWORD_HASHER_PORT, useClass: BcryptHasherAdapter },
    { provide: SESSION_CACHE_PORT, useClass: RedisSessionAdapter },
    { provide: USER_REPOSITORY_PORT, useClass: PostgresUserRepository },
    { provide: TENANT_REPOSITORY_PORT, useClass: PostgresTenantRepository },

    // Use Cases
    LoginUseCase,
    RefreshTokenUseCase,
    GetProfileUseCase,
    LogoutUseCase,

    // Guards
    JwtAuthGuard,
    RateLimitGuard,
  ],
  exports: [
    JwtAuthGuard,
    RateLimitGuard,
    TOKEN_SERVICE_PORT,
    SESSION_CACHE_PORT,
    PASSWORD_HASHER_PORT,
    LogoutUseCase,
  ],
})
export class AuthModule {}
