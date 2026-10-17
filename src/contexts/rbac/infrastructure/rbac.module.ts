import { Module } from '@nestjs/common';
import { USER_REPOSITORY_PORT } from '../../user/domain/ports/user-repository.port.js';
import { PostgresUserRepository } from '../../user/infrastructure/persistence/postgres-user.repository.js';
import { AssignRoleUseCase } from '../application/use-cases/assign-role.use-case.js';
import { RolesGuard } from './guards/roles.guard.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [
    { provide: USER_REPOSITORY_PORT, useClass: PostgresUserRepository },
    AssignRoleUseCase,
    RolesGuard,
  ],
  exports: [RolesGuard, AssignRoleUseCase],
})
export class RbacModule {}
