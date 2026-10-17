import { DataSource, EntityManager } from 'typeorm';
import { RlsContext } from './rls/rls.context.js';

export abstract class BasePostgresRepository {
  constructor(protected readonly dataSource: DataSource) {}

  protected get queryFn(): (sql: string, params?: unknown[]) => Promise<any[]> {
    const qr = RlsContext.getQueryRunner();
    return qr ? qr.query.bind(qr) : this.dataSource.query.bind(this.dataSource);
  }

  protected get entityManager(): EntityManager {
    return RlsContext.getEntityManager() ?? this.dataSource.manager;
  }
}
