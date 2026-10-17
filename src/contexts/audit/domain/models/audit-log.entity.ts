export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | null,
    public readonly action: string,
    public readonly entityName: string,
    public readonly entityId: string,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly details: Record<string, unknown>,
    public readonly createdAt: Date = new Date(),
  ) {}
}
