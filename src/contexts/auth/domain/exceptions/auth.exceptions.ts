import { DomainException } from '../../../../shared/domain/domain.exception.js';

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(
      'Credenciales inválidas',
      'INVALID_CREDENTIALS',
      401,
    );
  }
}

export class SessionExpiredException extends DomainException {
  constructor() {
    super(
      'Sesión expirada o invalidada',
      'SESSION_EXPIRED',
      401,
    );
  }
}

export class InvalidTokenException extends DomainException {
  constructor() {
    super(
      'Token inválido o expirado',
      'INVALID_TOKEN',
      401,
    );
  }
}
