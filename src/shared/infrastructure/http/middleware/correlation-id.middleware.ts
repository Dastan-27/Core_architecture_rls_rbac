import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware que garantiza que cada request HTTP tenga un correlation ID único.
 *
 * - Si el cliente envía `x-correlation-id`, se reutiliza.
 * - Si no, se genera uno nuevo con `crypto.randomUUID()`.
 *
 * El ID queda disponible en:
 *   - `req.headers['x-correlation-id']` para los handlers.
 *   - La respuesta via `res.setHeader(...)` para el cliente.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();

    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
