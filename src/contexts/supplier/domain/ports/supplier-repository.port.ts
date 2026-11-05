import type { Supplier } from '../models/supplier.entity.js';
import type { PaginatedResult } from '../../../../shared/domain/pagination.js';

export interface SupplierFilters {
  readonly search?: string;
  readonly isActive?: boolean;
  readonly page: number;
  readonly limit: number;
}

export interface SupplierRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly nit_rut: string;
  readonly business_name: string;
  readonly trade_name: string | null;
  readonly contact_name: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly is_active: boolean;
  readonly created_at: Date;
  readonly updated_at: Date;
}

export interface SupplierRepositoryPort {
  findById(id: string, tenantId: string): Promise<Supplier | null>;
  findByNitRut(nitRut: string, tenantId: string): Promise<Supplier | null>;
  findAll(tenantId: string, filters: SupplierFilters): Promise<PaginatedResult<SupplierRow>>;
  save(supplier: Supplier): Promise<Supplier>;
  update(supplier: Supplier): Promise<void>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
}

export const SUPPLIER_REPOSITORY_PORT = Symbol('SUPPLIER_REPOSITORY_PORT');

