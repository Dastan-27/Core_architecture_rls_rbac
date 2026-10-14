export interface SecurityContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: string;
}
