import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppConfigModule } from './shared/infrastructure/config/config.module.js';
import { DatabaseModule } from './shared/infrastructure/persistence/database.module.js';
import { RedisModule } from './shared/infrastructure/redis/redis.module.js';
import { RlsModule } from './shared/infrastructure/persistence/rls/rls.module.js';
import { CorrelationIdMiddleware } from './shared/infrastructure/http/middleware/correlation-id.middleware.js';

import { AuthModule } from './contexts/auth/infrastructure/auth.module.js';
import { RbacModule } from './contexts/rbac/infrastructure/rbac.module.js';
import { TenantModule } from './contexts/tenant/infrastructure/tenant.module.js';
import { BranchModule } from './contexts/branch/infrastructure/branch.module.js';
import { UserModule } from './contexts/user/infrastructure/user.module.js';
import { AuditModule } from './contexts/audit/infrastructure/audit.module.js';

import { HealthModule } from './shared/infrastructure/http/health/health.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    RlsModule,
    HealthModule,
    AuthModule,
    RbacModule,
    TenantModule,
    BranchModule,
    UserModule,
    AuditModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
