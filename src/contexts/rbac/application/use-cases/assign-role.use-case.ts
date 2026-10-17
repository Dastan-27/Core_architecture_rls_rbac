import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_PORT } from '../../../user/domain/ports/user-repository.port.js';
import type { UserRepositoryPort } from '../../../user/domain/ports/user-repository.port.js';
import { RBAC_SESSION_INVALIDATOR_PORT } from '../../domain/ports/rbac-session-invalidator.port.js';
import type { RbacSessionInvalidatorPort } from '../../domain/ports/rbac-session-invalidator.port.js';
import type { Role } from '../../domain/models/role.enum.js';
import { UserNotFoundException } from '../../../user/domain/exceptions/user.exceptions.js';
import { InsufficientPermissionsException } from '../../domain/exceptions/insufficient-permissions.exception.js';

export interface AssignRoleCommand {
  readonly userId: string;
  readonly tenantId: string;
  readonly newRole: Role;
  readonly assignedByRole: Role;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(RBAC_SESSION_INVALIDATOR_PORT)
    private readonly sessionCache: RbacSessionInvalidatorPort,
  ) {}

  async execute(command: AssignRoleCommand): Promise<void> {
    if (
      command.assignedByRole !== 'OWNER' &&
      command.assignedByRole !== 'ADMIN'
    ) {
      throw new InsufficientPermissionsException(
        'Solo OWNER y ADMIN pueden asignar roles',
      );
    }

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    if (command.assignedByRole === 'ADMIN') {
      if (user.role === 'OWNER' || command.newRole === 'OWNER') {
        throw new InsufficientPermissionsException(
          'ADMIN no puede modificar o asignar rol OWNER',
        );
      }
    }

    user.assignRole(command.newRole);
    await this.userRepository.save(user);
    await this.sessionCache.invalidateUserSessions(user.id);
  }
}
