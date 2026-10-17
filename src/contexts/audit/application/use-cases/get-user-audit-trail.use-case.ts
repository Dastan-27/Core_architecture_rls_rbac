import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_REPOSITORY_PORT } from '../../domain/ports/audit-repository.port.js';
import type { AuditRepositoryPort } from '../../domain/ports/audit-repository.port.js';
import type { AuditLog } from '../../domain/models/audit-log.entity.js';
import type { PaginatedResult } from '../../../../shared/domain/pagination.js';

export interface GetUserAuditTrailCommand {
  readonly userId: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly limit?: number;
}

@Injectable()
export class GetUserAuditTrailUseCase {
  constructor(
    @Inject(AUDIT_REPOSITORY_PORT)
    private readonly auditRepository: AuditRepositoryPort,
  ) {}

  async execute(
    command: GetUserAuditTrailCommand,
  ): Promise<PaginatedResult<AuditLog>> {
    const page = command.page ?? 1;
    const limit = command.limit ?? 20;
    return this.auditRepository.getAuditTrail(
      command.userId,
      command.tenantId,
      page,
      limit,
    );
  }
}
