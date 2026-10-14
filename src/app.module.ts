import { Module } from '@nestjs/common';
import { AppConfigModule } from './shared/infrastructure/config/config.module.js';
import { DatabaseModule } from './shared/infrastructure/persistence/database.module.js';
import { RlsModule } from './shared/infrastructure/persistence/rls/rls.module.js';

// Bounded Context Modules
import { AuthModule } from './contexts/auth/infrastructure/auth.module.js';
import { RbacModule } from './contexts/rbac/infrastructure/rbac.module.js';
import { TenantModule } from './contexts/tenant/infrastructure/tenant.module.js';
import { BranchModule } from './contexts/branch/infrastructure/branch.module.js';
import { UserModule } from './contexts/user/infrastructure/user.module.js';

@Module({
  imports: [
    // ─── Shared Infrastructure ─────────────────────────────────────────
    AppConfigModule,
    DatabaseModule,
    RlsModule,

    // ─── Bounded Contexts ──────────────────────────────────────────────
    AuthModule,
    RbacModule,
    TenantModule,
    BranchModule,
    UserModule,
  ],
})
export class AppModule {}
