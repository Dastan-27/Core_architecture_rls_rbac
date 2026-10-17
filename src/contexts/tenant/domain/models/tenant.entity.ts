export class Tenant {
  constructor(
    public readonly id: string,
    public nitRut: string,
    public businessName: string,
    public tradeName: string,
    public address: string,
    public phone: string,
    public email: string,
    public countryCode: string = 'COL',
    public currencyCode: string = 'COP',
    public isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {}

  updateContactInfo(address: string, phone: string, email: string): void {
    this.address = address;
    this.phone = phone;
    this.email = email;
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }
}
