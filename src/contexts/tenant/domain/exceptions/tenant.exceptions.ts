import { DomainException } from '../../../../shared/domain/domain.exception.js';

export class TenantNotFoundException extends DomainException {
  constructor(identifier?: string) {
    super(
      identifier
        ? `Tenant '${identifier}' no encontrado`
        : 'Empresa no encontrada',
      'TENANT_NOT_FOUND',
      404,
    );
  }
}

export class TenantAlreadyExistsException extends DomainException {
  constructor(nitRut: string) {
    super(
      `Ya existe una empresa registrada con el NIT/RUT '${nitRut}'`,
      'TENANT_ALREADY_EXISTS',
      409,
    );
  }
}
