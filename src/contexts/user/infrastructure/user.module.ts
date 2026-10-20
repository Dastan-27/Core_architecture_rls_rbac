import { Module } from '@nestjs/common';
import { USER_REPOSITORY_PORT } from '../domain/ports/user-repository.port.js';
import { USER_SESSION_INVALIDATOR_PORT } from '../domain/ports/user-session-invalidator.port.js';
import { SESSION_CACHE_PORT } from '../../auth/domain/ports/session-cache.port.js';
import { PostgresUserRepository } from './persistence/postgres-user.repository.js';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  UpdateUserProfileUseCase,
  UpdateUserStatusUseCase,
  ResetPasswordUseCase,
  DeleteUserUseCase,
} from '../application/use-cases/user.use-cases.js';
import { UsersController } from './http/users.controller.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { RbacModule } from '../../rbac/infrastructure/rbac.module.js';
import { BranchModule } from '../../branch/infrastructure/branch.module.js';
import { AuditModule } from '../../audit/infrastructure/audit.module.js';
import { TenantModule } from '../../tenant/infrastructure/tenant.module.js';

@Module({
  imports: [AuthModule, RbacModule, BranchModule, AuditModule, TenantModule],

  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY_PORT, useClass: PostgresUserRepository },
    {
      provide: USER_SESSION_INVALIDATOR_PORT,
      useExisting: SESSION_CACHE_PORT,
    },
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserProfileUseCase,
    UpdateUserStatusUseCase,
    ResetPasswordUseCase,
    DeleteUserUseCase,
  ],
  exports: [GetUserUseCase, ListUsersUseCase],
})
export class UserModule {}
