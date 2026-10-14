import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_PORT } from '../../../user/domain/ports/user-repository.port.js';
import type { UserRepositoryPort } from '../../../user/domain/ports/user-repository.port.js';
import { UserNotFoundException } from '../../../user/domain/exceptions/user.exceptions.js';

export interface UserProfile {
  readonly fullName: string;
  readonly role: string;
  readonly tenantName: string | null;
  readonly branchName: string | null;
  readonly tenantId?: string;
  readonly branchId?: string | null;
}

/**
 * Migra el SQL crudo de auth.controller.getMe() a un use case.
 * Usa el UserRepositoryPort en vez de acceder directamente al queryRunner.
 */
@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(userId: string, tenantId: string, role: string, branchId: string | null): Promise<UserProfile> {
    const user = await this.userRepository.findOneWithBranch(userId, tenantId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const profile: UserProfile = {
      fullName: user.full_name,
      role: user.role,
      tenantName: null, // TODO: enriquecer en Fase 7 con TenantRepository
      branchName: user.branch_name,
    };

    // IDs solo visibles para roles gerenciales
    if (role === 'OWNER' || role === 'ADMIN') {
      return { ...profile, tenantId, branchId };
    }

    return profile;
  }
}
