import type { User } from '../models/user.entity.js';

export interface UserFilters {
  role?: string;
  isActive?: boolean;
}

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  document_type: string;
  document_number: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<User | null>;
  findByDocumentNumber(documentNumber: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(tenantId: string, filters: UserFilters): Promise<UserRow[]>;
  findOne(
    id: string,
    tenantId: string,
  ): Promise<UserRow | null>;
  updateProfile(
    id: string,
    tenantId: string,
    fullName?: string,
    phone?: string | null,
    newTenantId?: string,
  ): Promise<UserRow | null>;
  resetPassword(id: string, tenantId: string, newHash: string): Promise<void>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  save(user: User): Promise<User>;
}

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');
