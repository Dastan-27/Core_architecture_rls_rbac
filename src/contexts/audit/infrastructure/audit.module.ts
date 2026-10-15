import { Module } from '@nestjs/common';
import { AUDIT_REPOSITORY_PORT } from '../domain/ports/audit-repository.port.js';
import { PostgresAuditRepository } from './persistence/postgres-audit.repository.js';
import { GetUserAuditTrailUseCase } from '../application/use-cases/get-user-audit-trail.use-case.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { RbacModule } from '../../rbac/infrastructure/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  providers: [
    { provide: AUDIT_REPOSITORY_PORT, useClass: PostgresAuditRepository },
    GetUserAuditTrailUseCase,
  ],
  exports: [AUDIT_REPOSITORY_PORT, GetUserAuditTrailUseCase],
})
export class AuditModule {}
