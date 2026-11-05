import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_PORT } from '../../../user/domain/ports/user-repository.port.js';
import type { UserRepositoryPort } from '../../../user/domain/ports/user-repository.port.js';
import { TENANT_REPOSITORY_PORT } from '../../../tenant/domain/ports/tenant-repository.port.js';
import type { TenantRepositoryPort } from '../../../tenant/domain/ports/tenant-repository.port.js';
import { UserNotFoundException } from '../../../user/domain/exceptions/user.exceptions.js';

export interface UserProfile {
  readonly fullName: string;
  readonly role: string;
  readonly tenantName: string | null;
  readonly tenantId?: string;
}

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(TENANT_REPOSITORY_PORT)
    private readonly tenantRepository: TenantRepositoryPort,
  ) {}

  async execute(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<UserProfile> {
    const [user, tenant] = await Promise.all([
      this.userRepository.findOne(userId, tenantId),
      this.tenantRepository.findById(tenantId),
    ]);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const profile: UserProfile = {
      fullName: user.full_name,
      role: user.role,
      tenantName: tenant?.businessName ?? null,
    };

    if (role === 'OWNER' || role === 'ADMIN') {
      return { ...profile, tenantId };
    }

    return profile;
  }
}
