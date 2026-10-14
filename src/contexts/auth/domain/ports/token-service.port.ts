export interface TokenPayload {
  readonly sub: string;
  readonly jti: string;
  readonly tenantId: string;
  readonly branchId: string | null;
  readonly role: string;
}

export interface TokenServicePort {
  sign(payload: TokenPayload): string;
  signRefresh(payload: TokenPayload): string;
  verify(token: string): Promise<TokenPayload>;
}

export const TOKEN_SERVICE_PORT = Symbol('TOKEN_SERVICE_PORT');
