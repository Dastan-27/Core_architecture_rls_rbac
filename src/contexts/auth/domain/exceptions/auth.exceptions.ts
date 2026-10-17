import { DomainException } from '../../../../shared/domain/domain.exception.js';

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Credenciales inválidas', 'INVALID_CREDENTIALS', 401);
  }
}

export class SessionExpiredException extends DomainException {
  constructor() {
    super('Sesión expirada o invalidada', 'SESSION_EXPIRED', 401);
  }
}

export class InvalidTokenException extends DomainException {
  constructor() {
    super('Token inválido o expirado', 'INVALID_TOKEN', 401);
  }
}

export class SessionCacheUnavailableException extends DomainException {
  constructor(
    message = 'El servicio de sesiones no está disponible temporalmente',
  ) {
    super(message, 'SESSION_CACHE_UNAVAILABLE', 503);
  }
}
