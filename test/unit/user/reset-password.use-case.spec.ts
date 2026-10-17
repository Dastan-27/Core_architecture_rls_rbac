import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordUseCase } from '../../../src/contexts/user/application/use-cases/user.use-cases.js';
import type { UserRepositoryPort } from '../../../src/contexts/user/domain/ports/user-repository.port.js';
import type { SessionCachePort } from '../../../src/contexts/auth/domain/ports/session-cache.port.js';
import { User } from '../../../src/contexts/user/domain/models/user.entity.js';
import { PasswordRequiredException } from '../../../src/contexts/user/domain/exceptions/user.exceptions.js';
import { InsufficientPermissionsException } from '../../../src/contexts/rbac/domain/exceptions/insufficient-permissions.exception.js';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let mockUserRepo: {
    findById: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };
  let mockSessionCache: {
    invalidateUserSessions: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      resetPassword: vi.fn().mockResolvedValue(undefined),
    };
    mockSessionCache = {
      invalidateUserSessions: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new ResetPasswordUseCase(
      mockUserRepo as unknown as UserRepositoryPort,
      mockSessionCache as unknown as SessionCachePort,
    );
  });

  it('debe resetear la contraseña e invalidar todas las sesiones activas en Redis', async () => {
    await useCase.execute({
      id: 'user-123',
      tenantId: 'tenant-1',
      newPasswordHash: 'new-hashed-password',
      requesterRole: 'OWNER',
    });

    expect(mockUserRepo.resetPassword).toHaveBeenCalledWith(
      'user-123',
      'tenant-1',
      'new-hashed-password',
    );
    expect(mockSessionCache.invalidateUserSessions).toHaveBeenCalledWith(
      'user-123',
    );
  });

  it('debe lanzar PasswordRequiredException si la nueva contraseña está vacía', async () => {
    await expect(
      useCase.execute({
        id: 'user-123',
        tenantId: 'tenant-1',
        newPasswordHash: '',
        requesterRole: 'OWNER',
      }),
    ).rejects.toThrow(PasswordRequiredException);

    expect(mockSessionCache.invalidateUserSessions).not.toHaveBeenCalled();
  });

  it('debe lanzar InsufficientPermissionsException si un ADMIN intenta resetear contraseña de un OWNER', async () => {
    const ownerUser = User.create({
      id: 'user-owner',
      tenantId: 'tenant-1',
      branchId: null,
      documentType: 'CC',
      documentNumber: '11111111',
      email: 'owner@test.com',
      passwordHash: 'hash',
      fullName: 'Owner User',
      phone: null,
      role: 'OWNER',
      isActive: true,
    });
    mockUserRepo.findById.mockResolvedValue(ownerUser);

    await expect(
      useCase.execute({
        id: 'user-owner',
        tenantId: 'tenant-1',
        newPasswordHash: 'new-hash',
        requesterRole: 'ADMIN',
      }),
    ).rejects.toThrow(InsufficientPermissionsException);

    expect(mockSessionCache.invalidateUserSessions).not.toHaveBeenCalled();
  });
});
