import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { USER_REPOSITORY_PORT } from '../../domain/ports/user-repository.port.js';
import type { UserRepositoryPort, UserFilters, UserWithBranch } from '../../domain/ports/user-repository.port.js';
import type { User } from '../../domain/models/user.entity.js';
import type { Role } from '../../../rbac/domain/models/role.enum.js';
import {
  UserNotFoundException,
  EmailAlreadyRegisteredException,
  PasswordRequiredException,
} from '../../domain/exceptions/user.exceptions.js';

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
}

export interface UpdateUserStatusCommand {
  readonly userId: string;
  readonly tenantId: string;
  readonly isActive: boolean;
}

export interface ResetPasswordCommand {
  readonly id: string;
  readonly tenantId: string;
  readonly newPasswordHash: string;
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

    const { User } = await import('../../domain/models/user.entity.js');
    const user = new User(
      uuidv4(),
      command.tenantId,
      command.branchId,
      command.documentType,
      command.documentNumber,
      command.email,
      command.passwordHash,
      command.fullName,
      command.phone,
      command.role,
      true,
      new Date(),
      new Date(),
    );

    return this.userRepository.save(user);
  }
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(tenantId: string, filters: UserFilters): Promise<UserWithBranch[]> {
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
  ) {}

  async execute(command: UpdateUserStatusCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }
    user.changeStatus(command.isActive);
    await this.userRepository.save(user);
  }
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    if (!command.newPasswordHash) {
      throw new PasswordRequiredException();
    }
    await this.userRepository.resetPassword(command.id, command.tenantId, command.newPasswordHash);
  }
}

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const deleted = await this.userRepository.softDelete(id, tenantId);
    if (!deleted) {
      throw new UserNotFoundException(id);
    }
  }
}

@Injectable()
export class ResolveBranchUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(tenantId: string, branchName: string): Promise<string | null> {
    return this.userRepository.findBranchIdByName(tenantId, branchName);
  }
}
