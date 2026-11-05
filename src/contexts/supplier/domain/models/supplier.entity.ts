import { BaseTenantEntity } from '../../../../shared/domain/base.entity.js';

export interface SupplierProps {
  readonly id: string;
  readonly tenantId: string;
  readonly nitRut: string;
  readonly businessName: string;
  readonly tradeName: string | null;
  readonly contactName: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly isActive?: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export class Supplier extends BaseTenantEntity {
  nitRut: string;
  businessName: string;
  tradeName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;

  private constructor(props: SupplierProps) {
    super(
      props.id,
      props.tenantId,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
    );
    this.nitRut = props.nitRut;
    this.businessName = props.businessName;
    this.tradeName = props.tradeName;
    this.contactName = props.contactName;
    this.phone = props.phone;
    this.email = props.email;
    this.address = props.address;
    this.isActive = props.isActive ?? true;
  }

  static create(props: SupplierProps): Supplier {
    return new Supplier(props);
  }

  update(fields: {
    businessName?: string;
    tradeName?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }): void {
    if (fields.businessName !== undefined) this.businessName = fields.businessName;
    if (fields.tradeName !== undefined) this.tradeName = fields.tradeName;
    if (fields.contactName !== undefined) this.contactName = fields.contactName;
    if (fields.phone !== undefined) this.phone = fields.phone;
    if (fields.email !== undefined) this.email = fields.email;
    if (fields.address !== undefined) this.address = fields.address;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }
}

