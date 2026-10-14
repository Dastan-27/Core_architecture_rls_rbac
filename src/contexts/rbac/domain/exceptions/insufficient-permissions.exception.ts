import { DomainException } from '../../../../shared/domain/domain.exception.js';

export class InsufficientPermissionsException extends DomainException {
  constructor(message = 'Permisos insuficientes para esta operacion') {
    super(message, 'INSUFFICIENT_PERMISSIONS', 403);
  }
}
