import type { Request } from 'express';

export interface JwtPayload {
  readonly sub: string;
  readonly jti: string;
  readonly tenantId: string;
  readonly branchId: string | null;
  readonly role: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
