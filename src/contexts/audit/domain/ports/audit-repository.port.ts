import type { PaginatedResult } from '../../../../shared/domain/pagination.js';
import type { AuditLog } from '../models/audit-log.entity.js';

export interface AuditRepositoryPort {
  getAuditTrail(
    userId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AuditLog>>;
  record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
}

export const AUDIT_REPOSITORY_PORT = Symbol('AUDIT_REPOSITORY_PORT');
