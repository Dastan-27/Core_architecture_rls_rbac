import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PASSWORD_HASHER_PORT } from '../../domain/ports/password-hasher.port.js';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';
import { TOKEN_SERVICE_PORT } from '../../domain/ports/token-service.port.js';
import type { TokenServicePort } from '../../domain/ports/token-service.port.js';
import { SESSION_CACHE_PORT } from '../../domain/ports/session-cache.port.js';
import type { SessionCachePort } from '../../domain/ports/session-cache.port.js';
import { USER_REPOSITORY_PORT } from '../../../user/domain/ports/user-repository.port.js';
import type { UserRepositoryPort } from '../../../user/domain/ports/user-repository.port.js';
import type { AuthResult } from '../../domain/models/auth-result.js';
import { InvalidCredentialsException } from '../../domain/exceptions/auth.exceptions.js';

export interface LoginCommand {
  readonly email: string;
  readonly passwordRaw: string;
}

const SESSION_TTL = 28800; // 8 hours in seconds

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE_PORT)
    private readonly tokenService: TokenServicePort,
    @Inject(SESSION_CACHE_PORT)
    private readonly sessionCache: SessionCachePort,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user || !user.isActive) {
      throw new InvalidCredentialsException();
    }

    const isValid = await this.passwordHasher.compare(
      command.passwordRaw,
      user.passwordHash,
    );
    if (!isValid) {
      throw new InvalidCredentialsException();
    }

    const jti = uuidv4();
    const payload = {
      sub: user.id,
      userId: user.id,
      jti,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
    };

    const accessToken = this.tokenService.sign(payload);
    const refreshToken = this.tokenService.signRefresh(payload);

    await this.sessionCache.saveSession(user.id, jti, SESSION_TTL);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        role: user.role,
      },
    };
  }
}
