import { Inject, Injectable } from '@nestjs/common';
import { BRANCH_REPOSITORY_PORT } from '../../domain/ports/branch-repository.port.js';
import type { BranchRepositoryPort } from '../../domain/ports/branch-repository.port.js';
import type { Branch } from '../../domain/models/branch.entity.js';
import { BranchNotFoundException } from '../../domain/exceptions/branch.exceptions.js';

export interface CreateBranchCommand {
  readonly tenantId: string;
  readonly name: string;
  readonly address?: string | null;
  readonly phone?: string | null;
  readonly isActive?: boolean;
}

export interface UpdateBranchCommand {
  readonly tenantId: string;
  readonly identifier: string;
  readonly name?: string;
  readonly address?: string | null;
  readonly phone?: string | null;
  readonly isActive?: boolean;
}

@Injectable()
export class ListBranchesUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY_PORT)
    private readonly branchRepository: BranchRepositoryPort,
  ) { }

  async execute(tenantId: string): Promise<Branch[]> {
    return this.branchRepository.findAll(tenantId);
  }
}

@Injectable()
export class GetBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY_PORT)
    private readonly branchRepository: BranchRepositoryPort,
  ) { }

  async execute(tenantId: string, identifier: string): Promise<Branch> {
    const branch = await this.branchRepository.findByIdentifier(tenantId, identifier);
    if (!branch) {
      throw new BranchNotFoundException(identifier);
    }
    return branch;
  }
}

@Injectable()
export class CreateBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY_PORT)
    private readonly branchRepository: BranchRepositoryPort,
  ) { }

  async execute(command: CreateBranchCommand): Promise<Branch> {
    const code = 'BR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    return this.branchRepository.create(
      command.tenantId, code, command.name,
      command.address, command.phone, command.isActive,
    );
  }
}

@Injectable()
export class UpdateBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY_PORT)
    private readonly branchRepository: BranchRepositoryPort,
  ) { }

  async execute(command: UpdateBranchCommand): Promise<Branch> {
    const updated = await this.branchRepository.update(
      command.tenantId, command.identifier,
      command.name, command.address, command.phone, command.isActive,
    );
    if (!updated) {
      throw new BranchNotFoundException(command.identifier);
    }
    return updated;
  }
}

@Injectable()
export class DeleteBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY_PORT)
    private readonly branchRepository: BranchRepositoryPort,
  ) { }

  async execute(tenantId: string, identifier: string): Promise<void> {
    const deleted = await this.branchRepository.softDelete(tenantId, identifier);
    if (!deleted) {
      throw new BranchNotFoundException(identifier);
    }
  }
}
