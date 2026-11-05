import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BasePostgresRepository } from '../../../../shared/infrastructure/persistence/base-postgres.repository.js';
import type {
  UserRepositoryPort,
  UserFilters,
  UserRow,
} from '../../domain/ports/user-repository.port.js';
import { User } from '../../domain/models/user.entity.js';
import type { Role } from '../../../rbac/domain/models/role.enum.js';
import { RlsContext } from '../../../../shared/infrastructure/persistence/rls/rls.context.js';

@Injectable()
export class PostgresUserRepository
  extends BasePostgresRepository
  implements UserRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async findByEmail(email: string): Promise<User | null> {
    const qr = RlsContext.getQueryRunner();

    if (qr) {
      const result = await qr.query(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        [email],
      );
      if (result.length === 0) return null;
      return this.mapToEntity(result[0]);
    }

    return await this.dataSource.transaction(async (manager) => {
      await manager.query("SET LOCAL app.bypass_rls = 'on'");
      const result = await manager.query(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        [email],
      );
      if (result.length === 0) return null;
      return this.mapToEntity(result[0]);
    });
  }

  async findByDocumentNumber(documentNumber: string): Promise<User | null> {
    const qr = RlsContext.getQueryRunner();

    if (qr) {
      const result = await qr.query(
        'SELECT * FROM users WHERE document_number = $1 LIMIT 1',
        [documentNumber],
      );
      if (result.length === 0) return null;
      return this.mapToEntity(result[0]);
    }

    return await this.dataSource.transaction(async (manager) => {
      await manager.query("SET LOCAL app.bypass_rls = 'on'");
      const result = await manager.query(
        'SELECT * FROM users WHERE document_number = $1 LIMIT 1',
        [documentNumber],
      );
      if (result.length === 0) return null;
      return this.mapToEntity(result[0]);
    });
  }

  async findById(id: string): Promise<User | null> {
    const qr = RlsContext.getQueryRunner();
    if (qr) {
      await qr.query("SET LOCAL app.bypass_rls = 'on'");
    }
    const result = await this.queryFn(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id],
    );
    if (result.length === 0) return null;
    return this.mapToEntity(result[0]);
  }

  async findAll(
    tenantId: string,
    filters: UserFilters,
  ): Promise<UserRow[]> {
    let sql = `
      SELECT
        u.id, u.full_name, u.email, u.phone,
        u.document_type, u.document_number, u.role,
        u.is_active, u.created_at, u.updated_at
      FROM users u
      WHERE u.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];

    if (filters.role) {
      params.push(filters.role);
      sql += ` AND u.role = $${params.length}`;
    }
    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      sql += ` AND u.is_active = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC';

    return this.queryFn(sql, params);
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<UserRow | null> {
    const qr = RlsContext.getQueryRunner();
    if (qr) {
      await qr.query("SET LOCAL app.bypass_rls = 'on'");
    }
    const result = await this.queryFn(
      `SELECT u.id, u.full_name, u.email, u.phone,
              u.document_type, u.document_number, u.role,
              u.is_active, u.created_at, u.updated_at
       FROM users u
       WHERE u.tenant_id = $1 AND u.id = $2`,
      [tenantId, id],
    );
    return result.length > 0 ? (result[0] as UserRow) : null;
  }

  async updateProfile(
    id: string,
    tenantId: string,
    fullName?: string,
    phone?: string | null,
    newTenantId?: string,
  ): Promise<UserRow | null> {
    const targetTenant = newTenantId ?? tenantId;

    const qr = RlsContext.getQueryRunner();
    if (qr) {
      if (newTenantId) {
        await qr.query("SET LOCAL app.bypass_rls = 'on'");
      }
      const result = await qr.query(
        `UPDATE users SET
           full_name  = COALESCE($1, full_name),
           phone      = COALESCE($2, phone),
           tenant_id  = $3,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [fullName, phone, targetTenant, id],
      );
      if (result.length === 0) return null;
      return this.findOne(id, targetTenant);
    }

    return await this.dataSource.transaction(async (manager) => {
      if (newTenantId) {
        await manager.query("SET LOCAL app.bypass_rls = 'on'");
      }
      const result = await manager.query(
        `UPDATE users SET
           full_name  = COALESCE($1, full_name),
           phone      = COALESCE($2, phone),
           tenant_id  = $3,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [fullName, phone, targetTenant, id],
      );
      if (result.length === 0) return null;
      return this.findOne(id, targetTenant);
    });
  }

  async resetPassword(
    id: string,
    tenantId: string,
    newHash: string,
  ): Promise<void> {
    const qr = RlsContext.getQueryRunner();
    if (qr) {
      await qr.query("SET LOCAL app.bypass_rls = 'on'");
      await qr.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND id = $3',
        [newHash, tenantId, id],
      );
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query("SET LOCAL app.bypass_rls = 'on'");
      await manager.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND id = $3',
        [newHash, tenantId, id],
      );
    });
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.queryFn(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, id],
    );
    return result.length > 0;
  }

  async save(user: User): Promise<User> {
    const qr = RlsContext.getQueryRunner();
    if (qr) {
      await qr.query("SET LOCAL app.bypass_rls = 'on'");
    }
    await this.queryFn(
      `INSERT INTO users (
        id, tenant_id, document_type, document_number,
        email, password_hash, full_name, phone, role, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        password_hash = EXCLUDED.password_hash,
        updated_at = EXCLUDED.updated_at`,
      [
        user.id,
        user.tenantId,
        user.documentType,
        user.documentNumber,
        user.email,
        user.passwordHash,
        user.fullName,
        user.phone,
        user.role,
        user.isActive,
        user.createdAt,
        user.updatedAt,
      ],
    );
    return user;
  }

  private mapToEntity(row: Record<string, unknown>): User {
    return User.create({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      documentType: row.document_type as string,
      documentNumber: row.document_number as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      fullName: row.full_name as string,
      phone: (row.phone as string) ?? null,
      role: row.role as Role,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }
}
