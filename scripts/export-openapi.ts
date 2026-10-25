import { Module } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

import { AuthController } from '../src/contexts/auth/infrastructure/http/auth.controller.js';
import { TenantsController } from '../src/contexts/tenant/infrastructure/http/tenants.controller.js';
import { BranchesController } from '../src/contexts/branch/infrastructure/http/branches.controller.js';
import { UsersController } from '../src/contexts/user/infrastructure/http/users.controller.js';
import { HealthController } from '../src/shared/infrastructure/http/health/health.controller.js';

import { PASSWORD_HASHER_PORT } from '../src/contexts/auth/domain/ports/password-hasher.port.js';
import { TOKEN_SERVICE_PORT } from '../src/contexts/auth/domain/ports/token-service.port.js';
import { SESSION_CACHE_PORT } from '../src/contexts/auth/domain/ports/session-cache.port.js';
import { REDIS_CLIENT } from '../src/shared/infrastructure/redis/redis.service.js';
import { JwtAuthGuard } from '../src/contexts/auth/infrastructure/http/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/contexts/rbac/infrastructure/guards/roles.guard.js';
import { RateLimitGuard } from '../src/shared/infrastructure/http/guards/rate-limit.guard.js';

import { LoginUseCase } from '../src/contexts/auth/application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from '../src/contexts/auth/application/use-cases/refresh-token.use-case.js';
import { GetProfileUseCase } from '../src/contexts/auth/application/use-cases/get-profile.use-case.js';
import { LogoutUseCase } from '../src/contexts/auth/application/use-cases/logout.use-case.js';
import { ForgotPasswordUseCase } from '../src/contexts/auth/application/use-cases/forgot-password.use-case.js';
import { ResetPasswordWithTokenUseCase } from '../src/contexts/auth/application/use-cases/reset-password-with-token.use-case.js';

import {
  ListTenantsUseCase,
  GetTenantUseCase,
  CreateTenantUseCase,
  UpdateTenantUseCase,
  DeactivateTenantUseCase,
} from '../src/contexts/tenant/application/use-cases/tenant.use-cases.js';

import {
  ListBranchesUseCase,
  GetBranchUseCase,
  CreateBranchUseCase,
  UpdateBranchUseCase,
  DeleteBranchUseCase,
} from '../src/contexts/branch/application/use-cases/branch.use-cases.js';

import {
  CreateUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  UpdateUserProfileUseCase,
  UpdateUserStatusUseCase,
  ResetPasswordUseCase,
  DeleteUserUseCase,
} from '../src/contexts/user/application/use-cases/user.use-cases.js';

import { AssignRoleUseCase } from '../src/contexts/rbac/application/use-cases/assign-role.use-case.js';
import { GetUserAuditTrailUseCase } from '../src/contexts/audit/application/use-cases/get-user-audit-trail.use-case.js';
import { HealthService } from '../src/shared/infrastructure/http/health/health.service.js';

const dummyProvider = (provide: any) => ({
  provide,
  useValue: new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
      return () => ({});
    },
  }),
});

@Module({
  controllers: [
    HealthController,
    AuthController,
    TenantsController,
    BranchesController,
    UsersController,
  ],
  providers: [
    Reflector,
    { provide: REDIS_CLIENT, useValue: {} },
    { provide: TOKEN_SERVICE_PORT, useValue: {} },
    { provide: SESSION_CACHE_PORT, useValue: {} },
    RateLimitGuard,
    JwtAuthGuard,
    RolesGuard,
    dummyProvider(HealthService),
    dummyProvider(PASSWORD_HASHER_PORT),
    dummyProvider(LoginUseCase),
    dummyProvider(RefreshTokenUseCase),
    dummyProvider(GetProfileUseCase),
    dummyProvider(LogoutUseCase),
    dummyProvider(ForgotPasswordUseCase),
    dummyProvider(ResetPasswordWithTokenUseCase),
    dummyProvider(ListTenantsUseCase),
    dummyProvider(GetTenantUseCase),
    dummyProvider(CreateTenantUseCase),
    dummyProvider(UpdateTenantUseCase),
    dummyProvider(DeactivateTenantUseCase),
    dummyProvider(ListBranchesUseCase),
    dummyProvider(GetBranchUseCase),
    dummyProvider(CreateBranchUseCase),
    dummyProvider(UpdateBranchUseCase),
    dummyProvider(DeleteBranchUseCase),
    dummyProvider(CreateUserUseCase),
    dummyProvider(ListUsersUseCase),
    dummyProvider(GetUserUseCase),
    dummyProvider(UpdateUserProfileUseCase),
    dummyProvider(UpdateUserStatusUseCase),
    dummyProvider(ResetPasswordUseCase),
    dummyProvider(DeleteUserUseCase),
    dummyProvider(AssignRoleUseCase),
    dummyProvider(GetUserAuditTrailUseCase),
  ],
})
class SwaggerAppModule {}

async function exportOpenApi() {
  try {
    console.log('Generando especificación OpenAPI...');
    const app = await NestFactory.create(SwaggerAppModule, { logger: ['error', 'warn'] });

    const config = new DocumentBuilder()
      .setTitle('API SaaS Contable')
      .setDescription('Core Architecture — Multi-Tenancy, RLS y RBAC')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    const outputPath = path.resolve(process.cwd(), 'mock/openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    console.log(`Documento OpenAPI exportado exitosamente en: ${outputPath}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error durante exportación OpenAPI:', error);
    process.exit(1);
  }
}

await exportOpenApi();
