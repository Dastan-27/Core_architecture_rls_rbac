export class Branch {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public code: string,
    public name: string,
    public address: string | null,
    public phone: string | null,
    public isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) { }

  updateDetails(name: string, address: string | null, phone: string | null): void {
    this.name = name;
    this.address = address;
    this.phone = phone;
  }
}
