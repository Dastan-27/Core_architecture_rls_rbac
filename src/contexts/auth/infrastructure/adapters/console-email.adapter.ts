import { Injectable, Logger } from '@nestjs/common';
import type {
  EmailServicePort,
  SendPasswordResetEmailParams,
} from '../../domain/ports/email-service.port.js';

@Injectable()
export class ConsoleEmailAdapter implements EmailServicePort {
  private readonly logger = new Logger(ConsoleEmailAdapter.name);

  async sendPasswordResetEmail(
    params: SendPasswordResetEmailParams,
  ): Promise<void> {
    this.logger.log(
      `\n============================================================\n` +
        `📧 [EMAIL SIMULATOR] RECUPERACIÓN DE CONTRASEÑA\n` +
        `Destinatario : ${params.fullName} <${params.to}>\n` +
        `Token (15 min): ${params.token}\n` +
        `Acción      : Enviar POST a /api/v1/auth/reset-password con:\n` +
        `{\n` +
        `  "token": "${params.token}",\n` +
        `  "newPassword": "TuNuevaPassword123*"\n` +
        `}\n` +
        `============================================================\n`,
    );
  }
}
