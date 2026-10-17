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
} from '../../domain/exceptions/user.exceptions.js';

import { USER_SESSION_INVALIDATOR_PORT } from '../../domain/ports/user-session-invalidator.port.js';
import type { UserSessionInvalidatorPort } from '../../domain/ports/user-session-invalidator.port.js';
import { InsufficientPermissionsException } from '../../../rbac/domain/exceptions/insufficient-permissions.exception.js';

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
}

export interface UpdateUserProfileCommand {
  readonly id: string;
  readonly tenantId: string;
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
      branchId: command.branchId,
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
  ) {}

  async execute(command: UpdateUserProfileCommand): Promise<UserWithBranch> {
    if (command.requesterRole === 'ADMIN') {
      const user = await this.userRepository.findById(command.id);
      if (user?.role === 'OWNER') {
        throw new InsufficientPermissionsException(
          'ADMIN no puede modificar al OWNER',
        );
      }
    }

    const updated = await this.userRepository.updateProfile(
      command.id,
      command.tenantId,
      command.fullName,
      command.phone,
      command.branchId,
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
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }
    if (command.requesterRole === 'ADMIN' && user.role === 'OWNER') {
      throw new InsufficientPermissionsException(
        'ADMIN no puede modificar al OWNER',
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
    if (command.requesterRole === 'ADMIN') {
      const user = await this.userRepository.findById(command.id);
      if (user?.role === 'OWNER') {
        throw new InsufficientPermissionsException(
          'ADMIN no puede modificar al OWNER',
        );
      }
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
    if (!user) {
      throw new UserNotFoundException(id);
    }
    if (requesterRole === 'ADMIN' && user.role === 'OWNER') {
      throw new InsufficientPermissionsException(
        'ADMIN no puede eliminar al OWNER',
      );
    }

    const deleted = await this.userRepository.softDelete(id, tenantId);
    if (!deleted) {
      throw new UserNotFoundException(id);
    }

    await this.sessionCache.invalidateUserSessions(id);
  }
}
