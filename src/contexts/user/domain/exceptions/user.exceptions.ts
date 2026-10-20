import { DomainException } from '../../../../shared/domain/domain.exception.js';

export class UserNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Usuario '${identifier}' no encontrado`, 'USER_NOT_FOUND', 404);
  }
}

export class EmailAlreadyRegisteredException extends DomainException {
  constructor(email: string) {
    super(
      `El email '${email}' ya está registrado`,
      'EMAIL_ALREADY_REGISTERED',
      409,
    );
  }
}

export class PasswordRequiredException extends DomainException {
  constructor() {
    super('La nueva contraseña es requerida', 'PASSWORD_REQUIRED', 400);
  }
}

export class DocumentAlreadyRegisteredException extends DomainException {
  constructor(documentType: string, documentNumber: string) {
    super(
      `El documento ${documentType} con número '${documentNumber}' ya está registrado`,
      'DOCUMENT_ALREADY_REGISTERED',
      409,
    );
  }
}

export class BranchRequiredForRoleException extends DomainException {
  constructor(role: string) {
    super(
      `La sucursal es obligatoria para el rol '${role}'`,
      'BRANCH_REQUIRED_FOR_ROLE',
      400,
    );
  }
}

