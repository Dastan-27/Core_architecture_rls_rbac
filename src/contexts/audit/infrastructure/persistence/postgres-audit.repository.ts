import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BasePostgresRepository } from '../../../../shared/infrastructure/persistence/base-postgres.repository.js';
import type { AuditRepositoryPort } from '../../domain/ports/audit-repository.port.js';
import { AuditLog } from '../../domain/models/audit-log.entity.js';
import {
  PaginatedResult,
  buildPaginationMeta,
  paginationOffset,
} from '../../../../shared/domain/pagination.js';

@Injectable()
export class PostgresAuditRepository
  extends BasePostgresRepository
  implements AuditRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async getAuditTrail(
    userId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AuditLog>> {
    const meta = buildPaginationMeta(page, limit, 0);
    const offset = paginationOffset(meta.page, meta.limit);

    const [rows, countResult] = await Promise.all([
      this.queryFn(
        `SELECT id, tenant_id, user_id, action, entity_name, entity_id, ip_address, user_agent, details, created_at
         FROM audit_logs
         WHERE tenant_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [tenantId, userId, meta.limit, offset],
      ),
      this.queryFn(
        'SELECT COUNT(*)::int AS total FROM audit_logs WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, userId],
      ),
    ]);

    const total = Number(countResult[0]?.total ?? 0);
    const finalMeta = buildPaginationMeta(meta.page, meta.limit, total);

    const data = rows.map(
      (r) =>
        new AuditLog(
          r.id as string,
          r.tenant_id as string,
          (r.user_id as string) ?? null,
          r.action as string,
          r.entity_name as string,
          r.entity_id as string,
          (r.ip_address as string) ?? null,
          (r.user_agent as string) ?? null,
          (r.details as Record<string, unknown>) ?? {},
          r.created_at ? new Date(r.created_at as string) : new Date(),
        ),
    );

    return {
      data,
      meta: finalMeta,
    };
  }

  async record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const id = uuidv4();
    const createdAt = new Date();
    await this.queryFn(
      `INSERT INTO audit_logs (
        id, tenant_id, user_id, action, entity_name, entity_id, ip_address, user_agent, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        entry.tenantId,
        entry.userId,
        entry.action,
        entry.entityName,
        entry.entityId,
        entry.ipAddress,
        entry.userAgent,
        JSON.stringify(entry.details ?? {}),
        createdAt,
      ],
    );

    return new AuditLog(
      id,
      entry.tenantId,
      entry.userId,
      entry.action,
      entry.entityName,
      entry.entityId,
      entry.ipAddress,
      entry.userAgent,
      entry.details,
      createdAt,
    );
  }
}
