import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { RLS_ENTITY_MANAGER_KEY } from './rls.constants.js';
import { RlsContext } from './rls.context.js';

export const RlsEntityManager = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EntityManager | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return (
      (request[RLS_ENTITY_MANAGER_KEY] as EntityManager | undefined) ??
      RlsContext.getEntityManager()
    );
  },
);
