import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { USER_REPOSITORY_PORT } from '../../domain/ports/user-repository.port.js';
import type {
  UserRepositoryPort,
  UserFilters,
  UserWithBranch,
} from '../../domain/ports/user-repository.port.js';
import { User } from '../../domain/models/user.entity.js';
import type { Role } from '../../../rbac/domain/models/role.enum.js';
import {
  UserNotFoundException,
  EmailAlreadyRegisteredException,
  PasswordRequiredException,
  DocumentAlreadyRegisteredException,
  BranchRequiredForRoleException,
} from '../../domain/exceptions/user.exceptions.js';

import { USER_SESSION_INVALIDATOR_PORT } from '../../domain/ports/user-session-invalidator.port.js';
import type { UserSessionInvalidatorPort } from '../../domain/ports/user-session-invalidator.port.js';
import { InsufficientPermissionsException } from '../../../rbac/domain/exceptions/insufficient-permissions.exception.js';
import { GetTenantUseCase } from '../../../tenant/application/use-cases/tenant.use-cases.js';

// ─── Commands ───────────────────────────────────────────────────────────────

export interface CreateUserCommand {
  readonly tenantId: string;
  readonly branchId: string | null;
  readonly documentType: string;
  readonly documentNumber: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly phone: string | null;
  readonly role: Role;
  readonly requesterRole?: Role;
}

export interface UpdateUserProfileCommand {
  readonly id: string;
  readonly tenantId: string;
  readonly newTenantId?: string;
  readonly fullName?: string;
  readonly phone?: string | null;
  readonly branchId?: string | null;
  readonly requesterRole?: Role;
}

export interface UpdateUserStatusCommand {
  readonly userId: string;
  readonly tenantId: string;
  readonly isActive: boolean;
  readonly requesterRole?: Role;
}

export interface ResetPasswordCommand {
  readonly id: string;
  readonly tenantId: string;
  readonly newPasswordHash: string;
  readonly requesterRole?: Role;
}

// ─── Use Cases ──────────────────────────────────────────────────────────────

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    if (command.requesterRole === 'ADMIN') {
      if (command.role === 'OWNER' || command.role === 'ADMIN') {
        throw new InsufficientPermissionsException(
          'ADMIN solo puede crear usuarios con roles ACCOUNTANT, WAREHOUSE_MANAGER o CASHIER',
        );
      }
    }

    let effectiveBranchId = command.branchId;
    if (command.role === 'OWNER') {
      effectiveBranchId = null;
    } else if (
      command.role === 'CASHIER' ||
      command.role === 'WAREHOUSE_MANAGER'
    ) {
      if (!effectiveBranchId) {
        throw new BranchRequiredForRoleException(command.role);
      }
    }

    const existing = await this.userRepository.findByEmail(command.email);
    if (existing) {
      throw new EmailAlreadyRegisteredException(command.email);
    }

    const existingDoc = await this.userRepository.findByDocumentNumber(
      command.documentNumber,
    );
    if (existingDoc) {
      throw new DocumentAlreadyRegisteredException(
        command.documentType,
        command.documentNumber,
      );
    }

    const user = User.create({
      id: uuidv4(),
      tenantId: command.tenantId,
      branchId: effectiveBranchId,
      documentType: command.documentType,
      documentNumber: command.documentNumber,
      email: command.email,
      passwordHash: command.passwordHash,
      fullName: command.fullName,
      phone: command.phone,
      role: command.role,
    });

    return this.userRepository.save(user);
  }
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(
    tenantId: string,
    filters: UserFilters,
  ): Promise<UserWithBranch[]> {
    return this.userRepository.findAll(tenantId, filters);
  }
}

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(id: string, tenantId: string): Promise<UserWithBranch> {
    const user = await this.userRepository.findOneWithBranch(id, tenantId);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return user;
  }
}

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(USER_SESSION_INVALIDATOR_PORT)
    private readonly sessionCache: UserSessionInvalidatorPort,
    private readonly getTenant: GetTenantUseCase,
  ) {}

  async execute(command: UpdateUserProfileCommand): Promise<UserWithBranch> {
    const user = await this.userRepository.findById(command.id);
    if (!user) {
      throw new UserNotFoundException(command.id);
    }

    // Un usuario de otro tenant solo puede ser modificado por el rol OWNER
    if (
      command.requesterRole !== 'OWNER' &&
      user.tenantId !== command.tenantId
    ) {
      throw new UserNotFoundException(command.id);
    }

    if (command.requesterRole === 'ADMIN') {
      if (user.role === 'OWNER' || user.role === 'ADMIN') {
        throw new InsufficientPermissionsException(
          'ADMIN no puede modificar el perfil de otro ADMIN ni del OWNER',
        );
      }
    }

    let targetTenantId = user.tenantId;
    let branchId = command.branchId;

    if (command.newTenantId && command.newTenantId !== user.tenantId) {
      if (command.requesterRole !== 'OWNER') {
        throw new InsufficientPermissionsException(
          'Solo el OWNER puede transferir un usuario a otra empresa',
        );
      }

      // Validar que la nueva empresa exista en el sistema
      await this.getTenant.execute(command.newTenantId);
      targetTenantId = command.newTenantId;

      // Al cambiar de empresa, la sucursal de la empresa anterior ya no aplica
      branchId = user.role === 'OWNER' ? null : (command.branchId ?? null);

      // Invalidar tokens activos de la sesión anterior en Redis
      await this.sessionCache.invalidateUserSessions(user.id);
    }

    // Los usuarios OWNER nunca tienen sucursal física asociada
    if (user.role === 'OWNER') {
      branchId = null;
    }

    const updated = await this.userRepository.updateProfile(
      command.id,
      user.tenantId,
      command.fullName,
      command.phone,
      branchId,
      targetTenantId,
    );
    if (!updated) {
      throw new UserNotFoundException(command.id);
    }
    return updated;
  }
}

@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(USER_SESSION_INVALIDATOR_PORT)
    private readonly sessionCache: UserSessionInvalidatorPort,
  ) {}

  async execute(command: UpdateUserStatusCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user || user.tenantId !== command.tenantId) {
      throw new UserNotFoundException(command.userId);
    }
    if (
      command.requesterRole === 'ADMIN' &&
      (user.role === 'OWNER' || user.role === 'ADMIN')
    ) {
      throw new InsufficientPermissionsException(
        'ADMIN no puede modificar a otro ADMIN ni al OWNER',
      );
    }

    user.changeStatus(command.isActive);
    await this.userRepository.save(user);

    if (!command.isActive) {
      await this.sessionCache.invalidateUserSessions(user.id);
    }
  }
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(USER_SESSION_INVALIDATOR_PORT)
    private readonly sessionCache: UserSessionInvalidatorPort,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    if (!command.newPasswordHash) {
      throw new PasswordRequiredException();
    }
    const user = await this.userRepository.findById(command.id);
    if (!user || user.tenantId !== command.tenantId) {
      throw new UserNotFoundException(command.id);
    }
    if (
      command.requesterRole === 'ADMIN' &&
      (user.role === 'OWNER' || user.role === 'ADMIN')
    ) {
      throw new InsufficientPermissionsException(
        'ADMIN no puede resetear la contraseña de otro ADMIN ni del OWNER',
      );
    }
    await this.userRepository.resetPassword(
      command.id,
      command.tenantId,
      command.newPasswordHash,
    );
    await this.sessionCache.invalidateUserSessions(command.id);
  }
}

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(USER_SESSION_INVALIDATOR_PORT)
    private readonly sessionCache: UserSessionInvalidatorPort,
  ) {}

  async execute(
    id: string,
    tenantId: string,
    requesterRole?: Role,
  ): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user || user.tenantId !== tenantId) {
      throw new UserNotFoundException(id);
    }
    if (requesterRole === 'ADMIN' && (user.role === 'OWNER' || user.role === 'ADMIN')) {
      throw new InsufficientPermissionsException(
        'ADMIN no puede eliminar a otro ADMIN ni al OWNER',
      );
    }

    const deleted = await this.userRepository.softDelete(id, tenantId);
    if (!deleted) {
      throw new UserNotFoundException(id);
    }

    await this.sessionCache.invalidateUserSessions(id);
  }
}
