import { DomainException } from '../../../domain/domain.exception.js';

export class RateLimitExceededException extends DomainException {
  constructor(retryAfterSeconds: number) {
    super(
      `Demasiados intentos. Por favor espere ${retryAfterSeconds} segundos antes de reintentar.`,
      'RATE_LIMIT_EXCEEDED',
      429,
    );
  }
}
