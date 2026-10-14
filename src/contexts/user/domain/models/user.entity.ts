import type { Role } from '../../../rbac/domain/models/role.enum.js';

export class User {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public branchId: string | null,
    public documentType: string,
    public documentNumber: string,
    public email: string,
    public passwordHash: string,
    public fullName: string,
    public phone: string | null,
    public role: Role,
    public isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  updateProfile(fullName: string, phone: string | null, branchId: string | null): void {
    this.fullName = fullName;
    this.phone = phone;
    this.branchId = branchId;
    this.updatedAt = new Date();
  }

  assignRole(newRole: Role): void {
    if (this.role === 'OWNER' && newRole !== 'OWNER') {
      throw new Error('Cannot downgrade OWNER role');
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
