export interface SendPasswordResetEmailParams {
  to: string;
  fullName: string;
  token: string;
}

export interface EmailServicePort {
  sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void>;
}

export const EMAIL_SERVICE_PORT = Symbol('EMAIL_SERVICE_PORT');
