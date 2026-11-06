import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BasePostgresRepository } from '../../../../shared/infrastructure/persistence/base-postgres.repository.js';
import type {
  SupplierRepositoryPort,
  SupplierFilters,
  SupplierRow,
} from '../../domain/ports/supplier-repository.port.js';
import { Supplier } from '../../domain/models/supplier.entity.js';
import type { PaginatedResult } from '../../../../shared/domain/pagination.js';
import { buildPaginationMeta, paginationOffset } from '../../../../shared/domain/pagination.js';

@Injectable()
export class PostgresSupplierRepository
  extends BasePostgresRepository
  implements SupplierRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async findById(id: string, tenantId: string): Promise<Supplier | null> {
    const result = await this.queryFn(
      'SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2 LIMIT 1',
      [id, tenantId],
    );
    if (result.length === 0) return null;
    return this.mapToEntity(result[0]);
  }

  async findByNitRut(nitRut: string, tenantId: string): Promise<Supplier | null> {
    const result = await this.queryFn(
      'SELECT * FROM suppliers WHERE nit_rut = $1 AND tenant_id = $2 LIMIT 1',
      [nitRut, tenantId],
    );
    if (result.length === 0) return null;
    return this.mapToEntity(result[0]);
  }

  async findAll(
    tenantId: string,
    filters: SupplierFilters,
  ): Promise<PaginatedResult<SupplierRow>> {
    let whereSql = 'WHERE s.tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (filters.search) {
      const sanitized = filters.search.replace(/[%_\\]/g, '\\$&');
      params.push(`%${sanitized}%`);
      whereSql += ` AND (s.business_name ILIKE $${params.length} ESCAPE '\\' OR s.trade_name ILIKE $${params.length} ESCAPE '\\')`;
    }

    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      whereSql += ` AND s.is_active = $${params.length}`;
    }

    const countResult = await this.queryFn(
      `SELECT COUNT(*)::int AS total FROM suppliers s ${whereSql}`,
      params,
    );
    const total = countResult[0]?.total ?? 0;

    const meta = buildPaginationMeta(filters.page, filters.limit, total);
    const offset = paginationOffset(filters.page, filters.limit);

    params.push(meta.limit, offset);
    const rows = await this.queryFn(
      `SELECT
        s.id, s.tenant_id, s.nit_rut, s.business_name, s.trade_name,
        s.contact_name, s.phone, s.email, s.address,
        s.is_active, s.created_at, s.updated_at
      FROM suppliers s
      ${whereSql}
      ORDER BY s.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { data: rows as SupplierRow[], meta };
  }

  async save(supplier: Supplier): Promise<Supplier> {
    await this.queryFn(
      `INSERT INTO suppliers (
        id, tenant_id, nit_rut, business_name, trade_name,
        contact_name, phone, email, address, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        supplier.id,
        supplier.tenantId,
        supplier.nitRut,
        supplier.businessName,
        supplier.tradeName,
        supplier.contactName,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.isActive,
        supplier.createdAt,
        supplier.updatedAt,
      ],
    );
    return supplier;
  }

  async update(supplier: Supplier): Promise<void> {
    await this.queryFn(
      `UPDATE suppliers SET
        business_name = $1,
        trade_name = $2,
        contact_name = $3,
        phone = $4,
        email = $5,
        address = $6,
        updated_at = $7
      WHERE id = $8 AND tenant_id = $9`,
      [
        supplier.businessName,
        supplier.tradeName,
        supplier.contactName,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.updatedAt,
        supplier.id,
        supplier.tenantId,
      ],
    );
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.queryFn(
      'UPDATE suppliers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId],
    );
    return result.length > 0;
  }

  private mapToEntity(row: Record<string, unknown>): Supplier {
    return Supplier.create({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      nitRut: row.nit_rut as string,
      businessName: row.business_name as string,
      tradeName: (row.trade_name as string) ?? null,
      contactName: (row.contact_name as string) ?? null,
      phone: (row.phone as string) ?? null,
      email: (row.email as string) ?? null,
      address: (row.address as string) ?? null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }
}

