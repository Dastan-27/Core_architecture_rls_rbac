import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssignRoleUseCase } from '../../../src/contexts/rbac/application/use-cases/assign-role.use-case.js';
import type { UserRepositoryPort } from '../../../src/contexts/user/domain/ports/user-repository.port.js';
import type { SessionCachePort } from '../../../src/contexts/auth/domain/ports/session-cache.port.js';
import { User } from '../../../src/contexts/user/domain/models/user.entity.js';
import { InsufficientPermissionsException } from '../../../src/contexts/rbac/domain/exceptions/insufficient-permissions.exception.js';
import { UserNotFoundException } from '../../../src/contexts/user/domain/exceptions/user.exceptions.js';

describe('AssignRoleUseCase', () => {
  let useCase: AssignRoleUseCase;
  let mockUserRepo: {
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let mockSessionCache: {
    saveSession: ReturnType<typeof vi.fn>;
    isSessionActive: ReturnType<typeof vi.fn>;
    invalidateSession: ReturnType<typeof vi.fn>;
    invalidateUserSessions: ReturnType<typeof vi.fn>;
  };

  const fakeUser = User.create({
    id: 'user-123',
    tenantId: 'tenant-1',
    branchId: null,
    documentType: 'CC',
    documentNumber: '12345678',
    email: 'john@example.com',
    passwordHash: 'hashed-pass',
    fullName: 'John Doe',
    phone: null,
    role: 'CASHIER',
    isActive: true,
  });

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      save: vi.fn(),
    };
    mockSessionCache = {
      saveSession: vi.fn(),
      isSessionActive: vi.fn(),
      invalidateSession: vi.fn(),
      invalidateUserSessions: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new AssignRoleUseCase(
      mockUserRepo as unknown as UserRepositoryPort,
      mockSessionCache as unknown as SessionCachePort,
    );
  });

  it('debe asignar el nuevo rol e invalidar todas las sesiones activas en Redis', async () => {
    mockUserRepo.findById.mockResolvedValue(fakeUser);
    mockUserRepo.save.mockResolvedValue(fakeUser);

    await useCase.execute({
      userId: 'user-123',
      tenantId: 'tenant-1',
      newRole: 'ADMIN',
      assignedByRole: 'OWNER',
    });

    expect(mockUserRepo.save).toHaveBeenCalledOnce();
    expect(fakeUser.role).toBe('ADMIN');
    expect(mockSessionCache.invalidateUserSessions).toHaveBeenCalledWith(
      'user-123',
    );
  });

  it('debe rechazar si el usuario asignador no es OWNER ni ADMIN', async () => {
    await expect(
      useCase.execute({
        userId: 'user-123',
        tenantId: 'tenant-1',
        newRole: 'ADMIN',
        assignedByRole: 'CASHIER',
      }),
    ).rejects.toThrow(InsufficientPermissionsException);

    expect(mockSessionCache.invalidateUserSessions).not.toHaveBeenCalled();
  });

  it('debe lanzar UserNotFoundException si el usuario no existe', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-999',
        tenantId: 'tenant-1',
        newRole: 'ADMIN',
        assignedByRole: 'OWNER',
      }),
    ).rejects.toThrow(UserNotFoundException);

    expect(mockSessionCache.invalidateUserSessions).not.toHaveBeenCalled();
  });
});
