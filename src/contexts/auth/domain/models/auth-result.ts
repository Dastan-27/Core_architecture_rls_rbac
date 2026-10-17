export interface AuthResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: {
    readonly id: string;
    readonly tenantId: string;
    readonly branchId: string | null;
    readonly role: string;
  };
}
