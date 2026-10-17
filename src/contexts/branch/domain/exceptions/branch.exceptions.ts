import { DomainException } from '../../../../shared/domain/domain.exception.js';

export class BranchNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Sucursal '${identifier}' no encontrada`, 'BRANCH_NOT_FOUND', 404);
  }
}
