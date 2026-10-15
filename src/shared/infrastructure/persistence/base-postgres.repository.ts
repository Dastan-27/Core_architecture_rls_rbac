import { DataSource } from 'typeorm';
import { RlsContext } from './rls/rls.context.js';

/**
 * Clase base para todos los repositorios Postgres con soporte RLS.
 *
 * Extrae el getter `queryFn` repetido en postgres-tenant, postgres-branch
 * y postgres-user repositories, aplicando el principio DRY.
 *
 * Uso: heredar esta clase e inyectar DataSource en el constructor hijo.
 */
export abstract class BasePostgresRepository {
  constructor(protected readonly dataSource: DataSource) {}

  /**
   * Retorna la función de query apropiada según el contexto RLS activo:
   * - Con RlsContext (dentro de un interceptor): usa el QueryRunner aislado.
   * - Sin RlsContext (login, tareas de sistema): usa el DataSource directamente.
   */
  protected get queryFn(): (sql: string, params?: unknown[]) => Promise<any[]> {
    const qr = RlsContext.getQueryRunner();
    return qr
      ? qr.query.bind(qr)
      : this.dataSource.query.bind(this.dataSource);
  }
}
