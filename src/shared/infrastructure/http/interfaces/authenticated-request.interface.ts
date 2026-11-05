import type { Request } from 'express';

export interface JwtPayload {
  readonly userId: string;
  readonly sub: string;
  readonly jti: string;
  readonly tenantId: string;
  readonly role: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
