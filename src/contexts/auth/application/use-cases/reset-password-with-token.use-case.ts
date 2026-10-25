import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_RESET_TOKEN_PORT } from '../../domain/ports/password-reset-token.port.js';
import type { PasswordResetTokenPort } from '../../domain/ports/password-reset-token.port.js';
import { USER_REPOSITORY_PORT } from '../../../user/domain/ports/user-repository.port.js';
import type { UserRepositoryPort } from '../../../user/domain/ports/user-repository.port.js';
import { PASSWORD_HASHER_PORT } from '../../domain/ports/password-hasher.port.js';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';
import { SESSION_CACHE_PORT } from '../../domain/ports/session-cache.port.js';
import type { SessionCachePort } from '../../domain/ports/session-cache.port.js';
import { InvalidTokenException } from '../../domain/exceptions/auth.exceptions.js';

export interface ResetPasswordWithTokenCommand {
  readonly token: string;
  readonly newPassword: string;
}

export interface ResetPasswordWithTokenResult {
  readonly message: string;
}

@Injectable()
export class ResetPasswordWithTokenUseCase {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_PORT)
    private readonly resetTokenPort: PasswordResetTokenPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(SESSION_CACHE_PORT)
    private readonly sessionCache: SessionCachePort,
  ) {}

  async execute(
    command: ResetPasswordWithTokenCommand,
  ): Promise<ResetPasswordWithTokenResult> {
    if (!command.token || !command.newPassword) {
      throw new InvalidTokenException('Token y nueva contraseña son requeridos');
    }

    const tokenData = await this.resetTokenPort.consumeResetToken(
      command.token,
    );
    if (!tokenData) {
      throw new InvalidTokenException(
        'El token de recuperación es inválido o ha expirado',
      );
    }

    const newHash = await this.passwordHasher.hash(command.newPassword);

    await this.userRepository.resetPassword(
      tokenData.userId,
      tokenData.tenantId,
      newHash,
    );

    // Revocar todas las sesiones activas en Redis
    await this.sessionCache.invalidateUserSessions(tokenData.userId);

    return {
      message:
        'Contraseña restablecida exitosamente. Ya puede iniciar sesión con su nueva contraseña.',
    };
  }
}
