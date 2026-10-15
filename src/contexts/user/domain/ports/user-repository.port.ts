import type { User } from '../models/user.entity.js';

export interface UserFilters {
  branchId?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserWithBranch {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  document_type: string;
  document_number: string;
  role: string;
  is_active: boolean;
  branch_id: string | null;
  branch_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(tenantId: string, filters: UserFilters): Promise<UserWithBranch[]>;
  findOneWithBranch(id: string, tenantId: string): Promise<UserWithBranch | null>;
  updateProfile(id: string, tenantId: string, fullName?: string, phone?: string | null, branchId?: string | null): Promise<UserWithBranch | null>;
  resetPassword(id: string, tenantId: string, newHash: string): Promise<void>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  save(user: User): Promise<User>;
}

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');
