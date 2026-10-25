import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { USER_REPOSITORY_PORT } from '../../../user/domain/ports/user-repository.port.js';
import type { UserRepositoryPort } from '../../../user/domain/ports/user-repository.port.js';
import { PASSWORD_RESET_TOKEN_PORT } from '../../domain/ports/password-reset-token.port.js';
import type { PasswordResetTokenPort } from '../../domain/ports/password-reset-token.port.js';
import { EMAIL_SERVICE_PORT } from '../../domain/ports/email-service.port.js';
import type { EmailServicePort } from '../../domain/ports/email-service.port.js';

export interface ForgotPasswordCommand {
  readonly email: string;
}

export interface ForgotPasswordResult {
  readonly message: string;
  readonly devToken?: string;
}

const RESET_TOKEN_TTL = 900; // 15 minutos en segundos

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_RESET_TOKEN_PORT)
    private readonly resetTokenPort: PasswordResetTokenPort,
    @Inject(EMAIL_SERVICE_PORT)
    private readonly emailService: EmailServicePort,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
    const defaultResponse: ForgotPasswordResult = {
      message:
        'Si el correo electrónico se encuentra registrado y activo, se ha enviado un enlace para restablecer la contraseña.',
    };

    const user = await this.userRepository.findByEmail(command.email);
    if (!user || !user.isActive) {
      // Prevención de enumeración de usuarios
      return defaultResponse;
    }

    const token = randomUUID();

    await this.resetTokenPort.saveResetToken(
      token,
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
      },
      RESET_TOKEN_TTL,
    );

    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      token,
    });

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    return {
      message: defaultResponse.message,
      ...(isDev ? { devToken: token } : {}),
    };
  }
}
