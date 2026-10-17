import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BasePostgresRepository } from '../../../../shared/infrastructure/persistence/base-postgres.repository.js';
import type { BranchRepositoryPort } from '../../domain/ports/branch-repository.port.js';
import { Branch } from '../../domain/models/branch.entity.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PostgresBranchRepository
  extends BasePostgresRepository
  implements BranchRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  private isUuid(value: string): boolean {
    return UUID_REGEX.test(value);
  }

  async findAll(tenantId: string): Promise<Branch[]> {
    const rows = await this.queryFn(
      'SELECT * FROM branches WHERE tenant_id = $1',
      [tenantId],
    );
    return rows.map((r) => this.mapToEntity(r));
  }

  async findByIdentifier(
    tenantId: string,
    identifier: string,
  ): Promise<Branch | null> {
    const condition = this.isUuid(identifier) ? 'id = $2' : 'name = $2';
    const result = await this.queryFn(
      `SELECT * FROM branches WHERE tenant_id = $1 AND ${condition}`,
      [tenantId, identifier],
    );
    return result.length > 0 ? this.mapToEntity(result[0]) : null;
  }

  async create(
    tenantId: string,
    code: string,
    name: string,
    address?: string | null,
    phone?: string | null,
    isActive?: boolean,
  ): Promise<Branch> {
    const result = await this.queryFn(
      `INSERT INTO branches (tenant_id, code, name, address, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, true)) RETURNING *`,
      [tenantId, code, name, address ?? null, phone ?? null, isActive],
    );
    return this.mapToEntity(result[0]);
  }

  async update(
    tenantId: string,
    identifier: string,
    name?: string,
    address?: string | null,
    phone?: string | null,
    isActive?: boolean,
  ): Promise<Branch | null> {
    const condition = this.isUuid(identifier) ? 'id = $6' : 'name = $6';
    const result = await this.queryFn(
      `UPDATE branches SET
         name = COALESCE($1, name), address = COALESCE($2, address),
         phone = COALESCE($3, phone), is_active = COALESCE($4, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $5 AND ${condition} RETURNING *`,
      [name, address, phone, isActive, tenantId, identifier],
    );
    return result.length > 0 ? this.mapToEntity(result[0]) : null;
  }

  async softDelete(tenantId: string, identifier: string): Promise<boolean> {
    const condition = this.isUuid(identifier) ? 'id = $2' : 'name = $2';
    const result = await this.queryFn(
      `UPDATE branches SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND ${condition} RETURNING id`,
      [tenantId, identifier],
    );
    return result.length > 0;
  }

  private mapToEntity(row: Record<string, unknown>): Branch {
    return new Branch(
      row.id as string,
      row.tenant_id as string,
      row.code as string,
      row.name as string,
      (row.address as string) ?? null,
      (row.phone as string) ?? null,
      row.is_active as boolean,
      row.created_at as Date,
    );
  }
}
