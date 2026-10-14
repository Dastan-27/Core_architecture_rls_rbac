import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { DataSource, QueryRunner } from 'typeorm';

import type { SecurityContext } from '../../../domain/security-context.interface.js';
import { RLS_ENTITY_MANAGER_KEY, RLS_VARIABLES } from './rls.constants.js';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RlsInterceptor.name);

  constructor(private readonly dataSource: DataSource) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const securityContext: SecurityContext | undefined = request.user;

    if (!securityContext?.userId) {
      return next.handle();
    }

    return from(this.executeWithRls(request, securityContext, next));
  }

  private async executeWithRls(
    request: Record<string, unknown>,
    ctx: SecurityContext,
    next: CallHandler,
  ): Promise<unknown> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.setRlsVariables(queryRunner, ctx);
      request[RLS_ENTITY_MANAGER_KEY] = queryRunner.manager;

      const result = await new Promise((resolve, reject) => {
        next.handle().subscribe({
          next: (value) => resolve(value),
          error: (err) => reject(err),
        });
      });

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async setRlsVariables(
    queryRunner: QueryRunner,
    ctx: SecurityContext,
  ): Promise<void> {
    await queryRunner.query(
      `SELECT set_config($1, $2, true),
              set_config($3, $4, true),
              set_config($5, $6, true)`,
      [
        RLS_VARIABLES.USER_ID,
        ctx.userId,
        RLS_VARIABLES.TENANT_ID,
        ctx.tenantId,
        RLS_VARIABLES.ROLE,
        ctx.role,
      ],
    );

    this.logger.debug(
      `RLS context: user=${ctx.userId} tenant=${ctx.tenantId} role=${ctx.role}`,
    );
  }
}
