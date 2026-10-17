import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { TenantSessionInvalidatorPort } from '../../domain/ports/tenant-session-invalidator.port.js';
import { SESSION_CACHE_PORT } from '../../../auth/domain/ports/session-cache.port.js';
import type { SessionCachePort } from '../../../auth/domain/ports/session-cache.port.js';

@Injectable()
export class RedisTenantSessionAdapter
  implements TenantSessionInvalidatorPort
{
  private readonly logger = new Logger(RedisTenantSessionAdapter.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(SESSION_CACHE_PORT)
    private readonly sessionCache: SessionCachePort,
  ) {}

  async invalidateTenantSessions(tenantId: string): Promise<void> {
    try {
      // Usar bypass_rls en caso de que la consulta se ejecute sin contexto de usuario específico
      const users: Array<{ id: string }> = await this.dataSource.query(
        'SELECT id FROM users WHERE tenant_id = $1',
        [tenantId],
      );

      if (users.length === 0) {
        return;
      }

      for (const user of users) {
        await this.sessionCache.invalidateUserSessions(user.id);
      }

      this.logger.log(
        `Invalidadas exitosamente las sesiones de ${users.length} usuarios para el tenant desactivado ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al invalidar sesiones de usuarios para tenant ${tenantId}`,
        (error as Error).stack,
      );
    }
  }
}
