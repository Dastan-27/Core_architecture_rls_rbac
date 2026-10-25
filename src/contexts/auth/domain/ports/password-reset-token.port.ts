export interface PasswordResetTokenData {
  userId: string;
  tenantId: string;
  email: string;
}

export interface PasswordResetTokenPort {
  saveResetToken(
    token: string,
    data: PasswordResetTokenData,
    ttlSeconds: number,
  ): Promise<void>;
  getResetToken(token: string): Promise<PasswordResetTokenData | null>;
  consumeResetToken(token: string): Promise<PasswordResetTokenData | null>;
}

export const PASSWORD_RESET_TOKEN_PORT = Symbol('PASSWORD_RESET_TOKEN_PORT');
