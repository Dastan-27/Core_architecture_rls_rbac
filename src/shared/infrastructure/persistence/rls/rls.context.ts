import { AsyncLocalStorage } from 'node:async_hooks';
import type { QueryRunner } from 'typeorm';

const storage = new AsyncLocalStorage<QueryRunner>();

export const RlsContext = {
  run<T>(queryRunner: QueryRunner, fn: () => T): T {
    return storage.run(queryRunner, fn);
  },

  getQueryRunner(): QueryRunner | undefined {
    return storage.getStore();
  },
};
