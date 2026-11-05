import { DomainException } from '../../../../shared/domain/domain.exception.js';

export class SupplierNotFoundException extends DomainException {
  constructor(id: string) {
    super(
      `Proveedor con ID ${id} no encontrado`,
      'SUPPLIER_NOT_FOUND',
      404,
    );
  }
}

export class SupplierAlreadyExistsException extends DomainException {
  constructor(nitRut: string) {
    super(
      `Ya existe un proveedor con NIT/RUT ${nitRut} en esta empresa`,
      'SUPPLIER_ALREADY_EXISTS',
      409,
    );
  }
}

export class SupplierFilterTooShortException extends DomainException {
  constructor() {
    super(
      'El filtro de búsqueda debe tener al menos 3 caracteres',
      'SUPPLIER_FILTER_TOO_SHORT',
      400,
    );
  }
}

