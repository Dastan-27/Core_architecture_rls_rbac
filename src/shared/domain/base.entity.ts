export abstract class BaseTenantEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  protected touch(): void {
    this.updatedAt = new Date();
  }
}
