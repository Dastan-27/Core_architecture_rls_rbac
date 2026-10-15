import type { Role } from '../../../rbac/domain/models/role.enum.js';
import { DomainException } from '../../../../shared/domain/domain.exception.js';
import { BaseTenantEntity } from '../../../../shared/domain/base.entity.js';

// ─── Props interface (elimina constructor monstruo) ──────────────────────────

export interface UserProps {
  readonly id: string;
  readonly tenantId: string;
  readonly branchId: string | null;
  readonly documentType: string;
  readonly documentNumber: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly phone: string | null;
  readonly role: Role;
  readonly isActive?: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

// ─── Entity ──────────────────────────────────────────────────────────────────

export class User extends BaseTenantEntity {
  branchId: string | null;
  documentType: string;
  documentNumber: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;

  private constructor(props: UserProps) {
    super(
      props.id,
      props.tenantId,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
    );
    this.branchId = props.branchId;
    this.documentType = props.documentType;
    this.documentNumber = props.documentNumber;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.fullName = props.fullName;
    this.phone = props.phone;
    this.role = props.role;
    this.isActive = props.isActive ?? true;
  }

  static create(props: UserProps): User {
    return new User(props);
  }

  // ─── Comportamientos de dominio ─────────────────────────────────────────────

  updateProfile(fullName: string, phone: string | null, branchId: string | null): void {
    this.fullName = fullName;
    this.phone = phone;
    this.branchId = branchId;
    this.updatedAt = new Date();
  }

  assignRole(newRole: Role): void {
    if (this.role === 'OWNER' && newRole !== 'OWNER') {
      throw new DomainException(
        'No se puede degradar el rol OWNER',
        'OWNER_ROLE_DOWNGRADE_FORBIDDEN',
        403,
      );
    }
    this.role = newRole;
    this.updatedAt = new Date();
  }

  changeStatus(isActive: boolean): void {
    this.isActive = isActive;
    this.updatedAt = new Date();
  }

  resetPassword(newHash: string): void {
    this.passwordHash = newHash;
    this.updatedAt = new Date();
  }
}
