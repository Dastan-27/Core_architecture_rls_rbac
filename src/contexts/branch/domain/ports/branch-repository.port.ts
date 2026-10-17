import type { Branch } from '../models/branch.entity.js';

export interface BranchRepositoryPort {
  findAll(tenantId: string): Promise<Branch[]>;
  findByIdentifier(
    tenantId: string,
    identifier: string,
  ): Promise<Branch | null>;
  create(
    tenantId: string,
    code: string,
    name: string,
    address?: string | null,
    phone?: string | null,
    isActive?: boolean,
  ): Promise<Branch>;
  update(
    tenantId: string,
    identifier: string,
    name?: string,
    address?: string | null,
    phone?: string | null,
    isActive?: boolean,
  ): Promise<Branch | null>;
  softDelete(tenantId: string, identifier: string): Promise<boolean>;
}

export const BRANCH_REPOSITORY_PORT = Symbol('BRANCH_REPOSITORY_PORT');
