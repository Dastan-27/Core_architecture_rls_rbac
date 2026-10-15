import { BaseTenantEntity } from '../../../../shared/domain/base.entity.js';

export class Branch extends BaseTenantEntity {
  constructor(
    id: string,
    tenantId: string,
    public code: string,
    public name: string,
    public address: string | null,
    public phone: string | null,
    public isActive: boolean = true,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ) {
    super(id, tenantId, createdAt, updatedAt);
  }

  updateDetails(name: string, address: string | null, phone: string | null): void {
    this.name = name;
    this.address = address;
    this.phone = phone;
    this.touch();
  }
}
