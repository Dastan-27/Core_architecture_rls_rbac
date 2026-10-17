import { AsyncLocalStorage } from 'node:async_hooks';
import type { QueryRunner, EntityManager } from 'typeorm';

const storage = new AsyncLocalStorage<QueryRunner>();

export const RlsContext = {
  run<T>(queryRunner: QueryRunner, fn: () => T): T {
    return storage.run(queryRunner, fn);
  },

  getQueryRunner(): QueryRunner | undefined {
    return storage.getStore();
  },

  getEntityManager(): EntityManager | undefined {
    return storage.getStore()?.manager;
  },
};
